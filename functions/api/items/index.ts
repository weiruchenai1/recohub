import { autoFetchIcon } from '../../lib/autoIcon'
import { isValidHttpUrl } from '../../lib/urlValidation'
import { json } from '../../lib/response'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const category = url.searchParams.get('category')
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('perPage') || '20')))
  const q = url.searchParams.get('q')?.trim() || ''

  const offset = (page - 1) * perPage

  let countSql = 'SELECT COUNT(*) as total FROM items'
  let dataSql = 'SELECT * FROM items'
  const params: (string | number)[] = []
  const conditions: string[] = []

  if (category) {
    conditions.push('category = ?')
    params.push(category)
  }

  if (q) {
    const like = `%${q}%`
    conditions.push('(name LIKE ? OR note LIKE ? OR url LIKE ?)')
    params.push(like, like, like)
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ')
    countSql += where
    dataSql += where
  }

  dataSql += ' ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?'

  const countParams = [...params]
  params.push(perPage, offset)

  const [countResult, dataResult] = await Promise.all([
    context.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    context.env.DB.prepare(dataSql).bind(...params).all(),
  ])

  return json({
    data: dataResult.results,
    total: countResult?.total ?? 0,
    page,
    perPage,
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    category: string
    name: string
    url: string
    note?: string
    sort_order?: number
    icon_url?: string | null
  }>()

  if (!body.category || !body.name || !body.url) {
    return json({ error: 'Missing required fields' }, 400)
  }

  if (!isValidHttpUrl(body.url)) {
    return json({ error: 'Invalid URL format' }, 400)
  }

  const existing = await context.env.DB.prepare(
    'SELECT id FROM items WHERE category = ? AND url = ?'
  )
    .bind(body.category, body.url)
    .first()

  if (existing) {
    return json({ error: '该分类下已存在相同链接的条目' }, 409)
  }

  // 提供了图标就直接用；否则先建条目，图标在后台异步抓取以免阻塞响应
  const providedIcon = body.icon_url ?? null

  const result = await context.env.DB.prepare(
    'INSERT INTO items (category, name, url, note, sort_order, icon_url) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(body.category, body.name, body.url, body.note || '', body.sort_order || 0, providedIcon)
    .run()

  const newId = result.meta.last_row_id

  if (!providedIcon) {
    // 抓取需 fetch 目标站点、可能耗时数秒，放到后台执行，不阻塞响应；抓到后回填 icon_url
    context.waitUntil(
      (async () => {
        const fetched = await autoFetchIcon(body.url, context.env.ICONS)
        if (fetched) {
          await context.env.DB.prepare('UPDATE items SET icon_url = ? WHERE id = ?')
            .bind(fetched, newId)
            .run()
        }
      })(),
    )
  }

  const item = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(newId)
    .first()

  return json(item, 201)
}
