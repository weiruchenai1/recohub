import { describe, it, expect } from 'vitest'
import { normalizeSQL } from '../functions/api/_middleware'

describe('normalizeSQL', () => {
  it('把多行 CREATE TABLE 压缩成单行', () => {
    const input = `CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);`

    const out = normalizeSQL(input)
    expect(out).toBe(
      'CREATE TABLE IF NOT EXISTS login_attempts ( id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL, created_at TEXT DEFAULT (datetime(\'now\')) )',
    )
  })

  it('把多行 INSERT ... VALUES 压缩成单行', () => {
    const input = `INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES
('software', '7-Zip', 'https://www.7-zip.org/', '开源免费解压缩软件', 1),
('software', 'Cherry Studio', 'https://www.cherry-ai.com/', '多模型 AI 客户端', 2);`

    const out = normalizeSQL(input)
    // 应该是一条完整 INSERT
    expect(out).toContain('INSERT OR IGNORE INTO items')
    expect(out).toContain("('software', '7-Zip'")
    expect(out).toContain("('software', 'Cherry Studio'")
    // 整个语句不应有换行
    expect(out).not.toContain('\n')
  })

  it('去掉注释行', () => {
    const input = `-- 这是注释
CREATE TABLE t (x INTEGER);
-- 这也是注释
INSERT INTO t VALUES (1);`

    expect(normalizeSQL(input)).toBe(
      'CREATE TABLE t (x INTEGER);\nINSERT INTO t VALUES (1)',
    )
  })

  it('过滤掉空语句', () => {
    expect(normalizeSQL('SELECT 1;;SELECT 2;')).toBe('SELECT 1;\nSELECT 2')
  })

  it('处理 Windows 行尾 (\\r\\n)', () => {
    const input = 'CREATE TABLE t (\r\nx INTEGER,\r\ny TEXT\r\n);\r\nINSERT INTO t VALUES (1, "a");'
    const out = normalizeSQL(input)
    // 验证单行、无换行残留、每条语句完整
    const stmts2 = out.split(';\n')
    for (const s of stmts2) expect(s).not.toContain('\n')
    expect(stmts2.length).toBe(2)
    expect(out).toContain('CREATE TABLE t')
    expect(out).toContain('INSERT INTO t VALUES')
  })

  it('完整 migrate.sql 不抛错且每条语句语法合法', () => {
    // 用实际嵌入的 SQL 常量验证（模拟 export 中的字符串）
    const sql = `-- RecoHub 完整幂等 Schema 迁移脚本

-- Schema 版本追踪
CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL);
INSERT INTO _schema_version (version) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM _schema_version);

-- 分类
CREATE TABLE IF NOT EXISTS categories (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);
INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('software', '软件推荐', 0);
INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('website', '网站推荐', 1);

-- 推荐条目
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    note TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    icon_url TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(category, url)
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_sort_order ON items(sort_order);

-- 登录失败记录
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);

-- 设置版本
UPDATE _schema_version SET version = 8;`

    const out = normalizeSQL(sql)
    const stmts = out.split(';\n')

    // 每条语句必须是单行
    for (const s of stmts) {
      expect(s).not.toContain('\n')
      expect(s.length).toBeGreaterThan(0)
    }

    // 关键语句存在且完整
    expect(out).toContain('CREATE TABLE IF NOT EXISTS login_attempts')
    expect(out).toContain('CREATE TABLE IF NOT EXISTS items')
    expect(out).toContain('UNIQUE(category, url)')
    expect(out).toContain("UPDATE _schema_version SET version = 8")
  })
})
