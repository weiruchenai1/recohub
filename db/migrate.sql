-- RecoHub 完整幂等 Schema 迁移脚本

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

-- 访客投稿
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    note TEXT DEFAULT '',
    category TEXT DEFAULT '',
    icon_url TEXT DEFAULT NULL,
    submitter_ip TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);

-- 评分（通过 Linux DO OAuth 登录的访客评分）
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    linuxdo_id INTEGER NOT NULL,
    linuxdo_username TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE(item_id, linuxdo_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_item_id ON ratings(item_id);
CREATE INDEX IF NOT EXISTS idx_ratings_linuxdo_id ON ratings(linuxdo_id);

-- 设置 schema 版本为 7
UPDATE _schema_version SET version = 7;
