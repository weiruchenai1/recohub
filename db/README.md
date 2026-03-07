# 数据库说明

## 基本信息

- **引擎**：Cloudflare D1 (SQLite)
- **对象存储**：Cloudflare R2（详见 [R2 对象存储说明](./R2.md)）
- **初始化方式**：首次请求时由 middleware 自动执行（SQL 来源于 `db/migrate.sql` + `db/seed.sql`，构建时嵌入）
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

`db/migrate.sql` 和 `db/seed.sql` 是数据库结构与种子数据的**唯一事实来源**。

### 构建时嵌入

构建时 `scripts/generate-schema.js` 读取这两个 SQL 文件，生成 `functions/lib/dbSchema.ts`（导出字符串常量）。middleware 在运行时 import 这些常量，无需在代码中重复编写 SQL。

```
db/migrate.sql  ──┐
                   ├──  npm run prebuild  ──→  functions/lib/dbSchema.ts  ──→  middleware 引用
db/seed.sql    ──┘
```

### 运行时行为

`functions/api/_middleware.ts` 中的 `checkDB` 在每次请求前执行轻量检查：

| 场景 | 处理方式 |
|---|---|
| 全新数据库（无 `items` 表） | 自动执行 `MIGRATE_SQL` + `SEED_SQL` 建表并写入种子数据 |
| 已有数据库，版本匹配 | 跳过，正常处理请求 |
| 已有数据库，版本不匹配 | 返回 503 错误，提示运行 `db:migrate` |

### Schema 变更流程

1. 更新 `db/schema.sql` 和 `db/migrate.sql`（保持幂等）
2. 更新 `_middleware.ts` 中的 `EXPECTED_VERSION` 常量
3. 重新构建（`npm run build` 会自动重新生成 `dbSchema.ts`）
4. 对已有数据库手动执行迁移：

```bash
# 远程数据库
npm run db:migrate

# 本地开发数据库
npm run db:migrate:local
```

## 数据导入导出

系统设置面板中的「数据管理」标签页提供了图形化的数据导入导出功能。也可以直接调用 API：

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `GET` | `/api/db/export` | 导出所有分组和条目为 JSON | 是 |
| `POST` | `/api/db/import` | 从 JSON 导入分组和条目 | 是 |

### 导出格式

```json
{
  "version": 1,
  "exported_at": "2025-01-01T00:00:00.000Z",
  "categories": [
    { "key": "software", "label": "软件", "sort_order": 0 }
  ],
  "items": [
    { "category": "software", "name": "示例", "url": "https://example.com", "note": "", "sort_order": 0, "icon_url": null, "created_at": "...", "updated_at": "..." }
  ]
}
```

### 导入模式

请求体中通过 `mode` 字段指定导入模式：

| 模式 | 说明 |
|------|------|
| `merge`（默认） | 保留现有数据，仅添加不存在的分组和条目（按 `category + url` 去重） |
| `overwrite` | 清空所有现有分组和条目后导入 |

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
