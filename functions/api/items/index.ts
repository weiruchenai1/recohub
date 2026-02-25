interface Env {
  DB: D1Database
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

  return new Response(JSON.stringify({
    data: dataResult.results,
    total: countResult?.total ?? 0,
    page,
    perPage,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    category: string
    name: string
    url: string
    note?: string
    sort_order?: number
  }>()

  if (!body.category || !body.name || !body.url) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const existing = await context.env.DB.prepare(
    'SELECT id FROM items WHERE category = ? AND url = ?'
  )
    .bind(body.category, body.url)
    .first()

  if (existing) {
    return new Response(JSON.stringify({ error: '该分类下已存在相同链接的条目' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await context.env.DB.prepare(
    'INSERT INTO items (category, name, url, note, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(body.category, body.name, body.url, body.note || '', body.sort_order || 0)
    .run()

  const item = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return new Response(JSON.stringify(item), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
