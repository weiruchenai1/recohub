-- RecoHub complete idempotent schema migration
-- Run via: npx wrangler d1 execute recohub-db --file=db/migrate.sql
-- Or for local: npx wrangler d1 execute recohub-db --local --file=db/migrate.sql
--
-- This script is safe to run multiple times (idempotent).
-- It creates all tables if they don't exist and ensures schema is at version 6.

-- Schema version tracking
CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL);
INSERT INTO _schema_version (version) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM _schema_version);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);
INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('software', '软件推荐', 0);
INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('website', '网站推荐', 1);

-- Items
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

-- Submissions
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

-- Mark schema as version 6
UPDATE _schema_version SET version = 6;
