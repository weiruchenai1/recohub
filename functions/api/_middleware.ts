import { jwtVerify } from 'jose'
import { runHealthCheck } from '../lib/healthCheck'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
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

// -- Schema version & migrations --

interface Migration {
  version: number
  description: string
  run: (db: D1Database) => Promise<void>
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Remove CHECK constraint on category column (table rebuild)',
    async run(db) {
      await db.batch([
        db.prepare(`CREATE TABLE items_new (
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
        db.prepare(`INSERT INTO items_new SELECT * FROM items`),
        db.prepare(`DROP TABLE items`),
        db.prepare(`ALTER TABLE items_new RENAME TO items`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_sort_order ON items(sort_order)`),
      ])
    },
  },
  {
    version: 2,
    description: 'Create categories table and populate from existing data',
    async run(db) {
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS categories (
          key TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0
        )`),
        // Seed default categories
        db.prepare(`INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('software', '软件推荐', 0)`),
        db.prepare(`INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('website', '网站推荐', 1)`),
      ])
      // Also insert any categories that exist in items but not yet in categories table
      const rows = await db.prepare(
        `SELECT DISTINCT category FROM items WHERE category NOT IN (SELECT key FROM categories)`
      ).all<{ category: string }>()
      if (rows.results.length > 0) {
        const maxOrder = await db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM categories').first<{ m: number }>()
        let order = (maxOrder?.m ?? -1) + 1
        for (const row of rows.results) {
          await db.prepare('INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES (?, ?, ?)')
            .bind(row.category, row.category, order++)
            .run()
        }
      }
    },
  },
  {
    version: 3,
    description: 'Add icon_url column to items table',
    async run(db) {
      await db.prepare('ALTER TABLE items ADD COLUMN icon_url TEXT DEFAULT NULL').run()
    },
  },
  {
    version: 4,
    description: 'Add submissions table and health-check columns to items',
    async run(db) {
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          note TEXT DEFAULT '',
          category TEXT DEFAULT '',
          submitter_ip TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        )`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at)`),
        db.prepare(`ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'ok'`),
        db.prepare(`ALTER TABLE items ADD COLUMN last_checked TEXT DEFAULT NULL`),
        db.prepare(`ALTER TABLE items ADD COLUMN fail_count INTEGER DEFAULT 0`),
      ])
    },
  },
  {
    version: 5,
    description: 'Add icon_url column to submissions table',
    async run(db) {
      await db.prepare('ALTER TABLE submissions ADD COLUMN icon_url TEXT DEFAULT NULL').run()
    },
  },
  {
    version: 6,
    description: 'Create settings table with default health check interval',
    async run(db) {
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`),
        db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('health_check_interval', '21600')`),
      ])
    },
  },
]

const LATEST_VERSION = migrations.length > 0 ? migrations[migrations.length - 1].version : 0

let dbInitialized = false

async function ensureDB(db: D1Database) {
  if (dbInitialized) return

  const hasItems = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='items'"
  ).first()

  if (!hasItems) {
    // Fresh database — create tables with latest schema + seed data, skip migrations
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)`),
      db.prepare(`INSERT INTO _schema_version (version) VALUES (${LATEST_VERSION})`),
      db.prepare(`CREATE TABLE IF NOT EXISTS categories (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      )`),
      db.prepare(`INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('software', '软件推荐', 0)`),
      db.prepare(`INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('website', '网站推荐', 1)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        note TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        icon_url TEXT DEFAULT NULL,
        status TEXT DEFAULT 'ok',
        last_checked TEXT DEFAULT NULL,
        fail_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(category, url)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_sort_order ON items(sort_order)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        note TEXT DEFAULT '',
        category TEXT DEFAULT '',
        icon_url TEXT DEFAULT NULL,
        submitter_ip TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`),
      db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('health_check_interval', '21600')`),
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
  } else {
    // Existing database — ensure _schema_version exists and run pending migrations
    const hasVersionTable = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'"
    ).first()

    if (!hasVersionTable) {
      await db.batch([
        db.prepare(`CREATE TABLE _schema_version (version INTEGER NOT NULL)`),
        db.prepare(`INSERT INTO _schema_version (version) VALUES (0)`),
      ])
    }

    const row = await db.prepare('SELECT version FROM _schema_version LIMIT 1').first<{ version: number }>()
    let currentVersion = row?.version ?? 0

    const pending = migrations.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version)

    for (const migration of pending) {
      await migration.run(db)
      await db.prepare('UPDATE _schema_version SET version = ?').bind(migration.version).run()
      currentVersion = migration.version
    }
  }

  dbInitialized = true
}

// -- Auto health check --
let nextCheckTime = 0

async function maybeRunHealthCheck(db: D1Database) {
  try {
    const setting = await db.prepare(
      "SELECT value FROM settings WHERE key = 'health_check_interval'"
    ).first<{ value: string }>()
    const intervalSec = parseInt(setting?.value || '21600')
    const intervalMs = intervalSec * 1000

    // Check if any items are stale (last_checked older than interval, or never checked)
    const cutoff = new Date(Date.now() - intervalMs).toISOString().replace('T', ' ').slice(0, 19)
    const stale = await db.prepare(
      'SELECT COUNT(*) as cnt FROM items WHERE last_checked IS NULL OR last_checked < ?'
    ).bind(cutoff).first<{ cnt: number }>()

    if (stale && stale.cnt > 0) {
      await runHealthCheck(db, 10)
      // More items may need checking, retry in 60s
      nextCheckTime = Date.now() + 60_000
    } else {
      // All fresh, wait full interval
      nextCheckTime = Date.now() + intervalMs
    }
  } catch {
    // On error, retry in 5 minutes
    nextCheckTime = Date.now() + 300_000
  }
}

export const onRequest: PagesFunction<Env> = async (context: CFContext) => {
  // Auto-initialize database on first request
  await ensureDB(context.env.DB)

  // Trigger background health check if due
  const now = Date.now()
  if (now >= nextCheckTime) {
    nextCheckTime = now + 60_000 // Prevent concurrent triggers
    context.waitUntil(maybeRunHealthCheck(context.env.DB))
  }

  const { request } = context
  const method = request.method.toUpperCase()

  // GET requests are public
  if (method === 'GET') {
    return context.next()
  }

  // POST to /api/login, /api/submissions, /api/icons/fetch, /api/icons/save are public
  const url = new URL(request.url)
  const publicPosts = ['/api/login', '/api/submissions', '/api/icons/fetch', '/api/icons/save']
  if (method === 'POST' && publicPosts.includes(url.pathname)) {
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
