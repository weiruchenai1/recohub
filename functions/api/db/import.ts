import { json } from '../../lib/response'

interface Env {
  DB: D1Database
}

interface ExportData {
  version: number
  categories: Array<{ key: string; label: string; sort_order: number }>
  items: Array<{
    category: string
    name: string
    url: string
    note: string
    sort_order: number
    icon_url: string | null
    created_at: string
    updated_at: string
  }>
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: ExportData & { mode?: string }
  try {
    body = await context.request.json()
  } catch {
    return json({ error: '无效的 JSON 数据' }, 400)
  }

  if (!body.categories || !body.items || !Array.isArray(body.categories) || !Array.isArray(body.items)) {
    return json({ error: '数据格式不正确，需包含 categories 和 items 数组' }, 400)
  }

  const mode = body.mode === 'overwrite' ? 'overwrite' : 'merge'
  const db = context.env.DB

  // 全部操作放入单个 db.batch()，由 D1 包在隐式事务中原子执行：任一语句失败则整体回滚，
  // 避免 overwrite 模式「先清空、再逐条插入」中途失败导致数据丢失。
  // 用 INSERT OR IGNORE 按主键 / 唯一约束去重（categories.key、items(category, url)），
  // 同时容忍导入数据自身的重复，不会因约束冲突中断整批。
  const prefix: D1PreparedStatement[] = []
  if (mode === 'overwrite') {
    prefix.push(db.prepare('DELETE FROM items'))
    prefix.push(db.prepare('DELETE FROM categories'))
  }

  const catStmts = body.categories
    .filter((c) => c && c.key && c.label)
    .map((c) =>
      db
        .prepare('INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES (?, ?, ?)')
        .bind(c.key, c.label, c.sort_order ?? 0),
    )

  // 图标文件不随数据导出，导入时 icon_url 强制为 NULL（恢复自动获取）
  const now = new Date().toISOString()
  const itemStmts = body.items
    .filter((it) => it && it.category && it.name && it.url)
    .map((it) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO items (category, name, url, note, sort_order, icon_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)',
        )
        .bind(it.category, it.name, it.url, it.note || '', it.sort_order ?? 0, it.created_at || now, it.updated_at || now),
    )

  try {
    const all = [...prefix, ...catStmts, ...itemStmts]
    const results = all.length ? await db.batch(all) : []

    // meta.changes 为实际写入行数：INSERT OR IGNORE 命中去重时为 0
    const catResults = results.slice(prefix.length, prefix.length + catStmts.length)
    const itemResults = results.slice(prefix.length + catStmts.length)
    const catImported = catResults.reduce((n, r) => n + (r.meta.changes || 0), 0)
    const itemImported = itemResults.reduce((n, r) => n + (r.meta.changes || 0), 0)

    return json({
      success: true,
      categories_imported: catImported,
      items_imported: itemImported,
      items_skipped: itemStmts.length - itemImported,
    })
  } catch (e) {
    return json({ error: '导入失败: ' + (e as Error).message }, 500)
  }
}
