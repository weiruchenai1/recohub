# 数据库说明

## 基本信息

- **引擎**：Cloudflare D1 (SQLite)
- **初始化方式**：首次请求时由 `functions/api/_middleware.ts` 中的 `ensureDB` 自动完成
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
| created_at | TEXT DEFAULT (datetime('now')) | 创建时间 |
| updated_at | TEXT DEFAULT (datetime('now')) | 更新时间 |

**约束**：`UNIQUE(category, url)` — 同一分组下 URL 不可重复

**索引**：
- `idx_items_category` — category 列
- `idx_items_sort_order` — sort_order 列

## 自动迁移机制

迁移逻辑位于 `functions/api/_middleware.ts`，在 `ensureDB` 中执行。

### 运行时行为

| 场景 | 处理方式 |
|---|---|
| 全新数据库（无 `items` 表） | 用最新 schema 建表 + 写入种子数据，`_schema_version` 直接设为最新版本，不执行迁移 |
| 已有数据库，首次引入迁移（无 `_schema_version` 表） | 创建 `_schema_version` 表并设 version=0，依次执行所有迁移 |
| 已有数据库，部分已迁移 | 读取当前版本号，仅执行版本号更大的迁移 |

### 迁移历史

| 版本 | 说明 |
|---|---|
| 1 | 移除 `category` 列的 CHECK 约束，通过 SQLite 表重建模式实现 |
| 2 | 创建 `categories` 表并从已有 items 中自动补录分类，种子数据包含默认的 `software` 和 `website` 分类 |

### 添加新迁移

1. 在 `_middleware.ts` 的 `migrations` 数组末尾追加新条目：

```ts
{
  version: 3,
  description: '描述变更内容',
  async run(db) {
    // 执行 SQL
  },
},
```

2. 如果 schema 结构变了，同步更新 `ensureDB` 中全新数据库的 CREATE TABLE 语句和 `db/schema.sql`。

`LATEST_VERSION` 会自动从 `migrations` 数组最后一项取值，无需手动维护。

## 独立迁移脚本

除了运行时自动迁移，也提供了独立的 SQL 迁移脚本 `db/migrate.sql`，可在部署时通过 npm script 运行：

```bash
# 远程数据库
npm run db:migrate
npm run db:seed

# 本地开发数据库
npm run db:migrate:local
npm run db:seed:local
```

对于个人使用，运行时自动迁移足够可靠。如果是公开部署场景，建议将迁移剥离到部署流程中以避免并发冷启动的性能损耗。
