-- Migration script for RecoHub database
-- Run via: npx wrangler d1 execute recohub-db --file=db/migrate.sql
-- Or for local: npx wrangler d1 execute recohub-db --local --file=db/migrate.sql

-- Ensure schema version table exists
CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL);
INSERT INTO _schema_version (version) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM _schema_version);

-- Ensure categories table exists
CREATE TABLE IF NOT EXISTS categories (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Seed default categories
INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('software', '软件推荐', 0);
INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES ('website', '网站推荐', 1);
