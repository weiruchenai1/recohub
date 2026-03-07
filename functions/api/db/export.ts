interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const [categories, items] = await Promise.all([
    context.env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all(),
    context.env.DB.prepare('SELECT * FROM items ORDER BY category ASC, sort_order ASC, id ASC').all(),
  ])

  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    categories: categories.results,
    items: items.results,
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="recohub-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
