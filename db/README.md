# 数据库说明

## 基本信息

- **引擎**：Cloudflare D1 (SQLite)
- **对象存储**：Cloudflare R2（详见 [R2 对象存储说明](./R2.md)）
- **初始化方式**：首次请求时由 `functions/api/_middleware.ts` 中的 `checkDB` 自动完成
- **参考 Schema**：`db/schema.sql`

## 表结构

### `_schema_version`

记录当前数据库 schema 版本号，单行单列。

| 列 | 类型 | 说明 |
|---|---|---|
| version | INTEGER NOT NULL | 当前 schema 版本号 |

### `categories`

存储分类（分组）配置，支持多端同步。

| 列 | 类型 | 说明 |
|---|---|---|
| key | TEXT PRIMARY KEY | 分类标识（如 `software`、`website`） |
| label | TEXT NOT NULL | 分类显示名称 |
| sort_order | INTEGER DEFAULT 0 | 排序权重（越小越靠前） |

### `items`

存储所有推荐项目。

| 列 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| category | TEXT NOT NULL | 分组标识，对应 `categories.key` |
| name | TEXT NOT NULL | 项目名称 |
| url | TEXT NOT NULL | 项目链接 |
| note | TEXT DEFAULT '' | 备注说明 |
| sort_order | INTEGER DEFAULT 0 | 排序权重 |
| icon_url | TEXT DEFAULT NULL | 自定义图标 URL（指向 R2 存储的图标路径，如 `/api/icons/xxx.png`；为 NULL 时使用自动获取） |
| created_at | TEXT DEFAULT (datetime('now')) | 创建时间 |
| updated_at | TEXT DEFAULT (datetime('now')) | 更新时间 |

**约束**：`UNIQUE(category, url)` — 同一分组下 URL 不可重复

**索引**：
- `idx_items_category` — category 列
- `idx_items_sort_order` — sort_order 列

### `submissions`

存储访客提交的网站推荐，等待管理员审核。

| 列 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| name | TEXT NOT NULL | 推荐名称 |
| url | TEXT NOT NULL | 推荐链接 |
| note | TEXT DEFAULT '' | 备注说明 |
| category | TEXT DEFAULT '' | 建议分组 |
| icon_url | TEXT DEFAULT NULL | 图标 URL |
| submitter_ip | TEXT DEFAULT '' | 提交者 IP（用于频率限制） |
| created_at | TEXT DEFAULT (datetime('now')) | 提交时间 |

**索引**：
- `idx_submissions_created` — created_at 列

## 数据库初始化机制

初始化逻辑位于 `functions/api/_middleware.ts` 的 `checkDB` 函数中。运行时不执行迁移，仅做轻量检查。

### 运行时行为

| 场景 | 处理方式 |
|---|---|
| 全新数据库（无 `items` 表） | 用最新 schema 建表 + 写入种子数据，`_schema_version` 直接设为最新版本（幂等，并发安全） |
| 已有数据库，版本匹配 | 跳过，正常处理请求 |
| 已有数据库，版本不匹配 | 返回 503 错误，提示需要运行 `db:migrate` |

### Schema 变更流程

运行时不再执行迁移。Schema 变更需要：

1. 更新 `db/schema.sql` 和 `db/migrate.sql`（保持幂等）
2. 更新 `_middleware.ts` 中 `checkDB` 的 CREATE TABLE 语句和 `LATEST_VERSION` 常量
3. 通过 npm script 执行迁移：

```bash
# 远程数据库
npm run db:migrate

# 本地开发数据库
npm run db:migrate:local
```

## 独立迁移脚本

`db/migrate.sql` 是一个完整的幂等 schema 脚本，包含所有表的 `CREATE TABLE IF NOT EXISTS` 和种子数据，末尾将 `_schema_version` 设为最新版本。可安全重复执行。

```bash
# 远程数据库
npm run db:migrate
npm run db:seed

# 本地开发数据库
npm run db:migrate:local
npm run db:seed:local
```
