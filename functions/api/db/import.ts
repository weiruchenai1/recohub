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
    return new Response(JSON.stringify({ error: '无效的 JSON 数据' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.categories || !body.items || !Array.isArray(body.categories) || !Array.isArray(body.items)) {
    return new Response(JSON.stringify({ error: '数据格式不正确，需包含 categories 和 items 数组' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const mode = body.mode || 'merge' // 'merge' | 'overwrite'
  const db = context.env.DB

  try {
    if (mode === 'overwrite') {
      // Clear existing data
      await db.exec('DELETE FROM items; DELETE FROM categories;')
    }

    // Import categories
    let catImported = 0
    for (const cat of body.categories) {
      if (!cat.key || !cat.label) continue
      if (mode === 'overwrite') {
        await db.prepare(
          'INSERT INTO categories (key, label, sort_order) VALUES (?, ?, ?)'
        ).bind(cat.key, cat.label, cat.sort_order ?? 0).run()
        catImported++
      } else {
        // Merge: insert if not exists
        const existing = await db.prepare('SELECT key FROM categories WHERE key = ?').bind(cat.key).first()
        if (!existing) {
          await db.prepare(
            'INSERT INTO categories (key, label, sort_order) VALUES (?, ?, ?)'
          ).bind(cat.key, cat.label, cat.sort_order ?? 0).run()
          catImported++
        }
      }
    }

    // Import items
    let itemImported = 0
    let itemSkipped = 0
    for (const item of body.items) {
      if (!item.category || !item.name || !item.url) continue
      // Check duplicate (same category + url)
      const existing = await db.prepare(
        'SELECT id FROM items WHERE category = ? AND url = ?'
      ).bind(item.category, item.url).first()

      if (existing) {
        itemSkipped++
        continue
      }

      await db.prepare(
        'INSERT INTO items (category, name, url, note, sort_order, icon_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        item.category,
        item.name,
        item.url,
        item.note || '',
        item.sort_order ?? 0,
        item.icon_url ?? null,
        item.created_at || new Date().toISOString(),
        item.updated_at || new Date().toISOString(),
      ).run()
      itemImported++
    }

    return new Response(JSON.stringify({
      success: true,
      categories_imported: catImported,
      items_imported: itemImported,
      items_skipped: itemSkipped,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: '导入失败: ' + (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
