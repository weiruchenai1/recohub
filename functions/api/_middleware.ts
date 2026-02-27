import { jwtVerify } from 'jose'

interface Env {
  DB: D1Database
  AUTH_PASSWORD: string
  JWT_SECRET: string
}

type CFContext = EventContext<Env, string, unknown>

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

let dbInitialized = false

async function ensureDB(db: D1Database) {
  if (dbInitialized) return

  const check = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='items'"
  ).first()

  if (!check) {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        note TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(category, url)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_sort_order ON items(sort_order)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '7-Zip', 'https://www.7-zip.org/', '开源免费解压缩软件', 1)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Cherry Studio', 'https://www.cherry-ai.com/', '多模型 AI 客户端', 2)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Clash Party', 'https://clashparty.org/', '网络代理工具', 3)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Cursor', 'https://www.cursor.com/', 'AI 辅助代码编辑器', 4)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '格式工厂 (FormatFactory)', 'http://www.pcfreetime.com/formatfactory/cn/index.html', '万能格式转换工具', 5)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '网易UU远程 (GameViewer)', 'https://gv.163.com/', '原GameViewer，网易远程控制', 6)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Git', 'https://git-scm.com/downloads', '开发者版本控制工具', 7)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '火绒安全', 'https://www.huorong.cn/', '轻量级杀毒软件，无广告', 8)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Visual Studio Code', 'https://code.visualstudio.com/', '微软代码编辑器', 9)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'MuMu 模拟器', 'https://mumu.163.com/', '网易安卓手游模拟器', 10)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Node.js', 'https://nodejs.org/zh-cn/', 'JavaScript 运行环境', 11)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'QQ (NT架构版)', 'https://im.qq.com/pcqq/', '基于 Electron 的新版 QQ', 12)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '搜狗输入法', 'https://shurufa.sogou.com/', '中文输入法', 13)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Steam', 'https://store.steampowered.com/about/', '全球最大游戏平台', 14)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Watt Toolkit (Steam++)', 'https://steampp.net/', '开源游戏网络工具箱', 15)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'Telegram Desktop', 'https://desktop.telegram.org/', '即时通讯 (需网络环境)', 16)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '微信 (Windows)', 'https://windows.weixin.qq.com/', '微信电脑版', 17)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'WizTree', 'https://diskanalyzer.com/', '极速磁盘空间分析工具', 18)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', 'WPS Office', 'https://www.wps.cn/', '金山办公软件', 19)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('software', '图吧工具箱', 'https://www.tbtool.cn/', '硬件检测工具合集', 20)`),
      db.prepare(`INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES ('website', 'GitHub', 'https://github.com/', '全球最大代码托管平台', 1)`),
    ])
  }

  dbInitialized = true
}

export const onRequest: PagesFunction<Env> = async (context: CFContext) => {
  // Auto-initialize database on first request
  await ensureDB(context.env.DB)

  const { request } = context
  const method = request.method.toUpperCase()

  // GET requests are public
  if (method === 'GET') {
    return context.next()
  }

  // POST to /api/login is public
  const url = new URL(request.url)
  if (method === 'POST' && url.pathname === '/api/login') {
    return context.next()
  }

  // All other write operations require JWT
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized()
  }

  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    await jwtVerify(token, secret)
  } catch {
    return unauthorized()
  }

  return context.next()
}
