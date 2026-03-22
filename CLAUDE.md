# CLAUDE.md

## 首要步骤

开始任何任务前，先阅读以下文档以了解项目全貌：

- `README.md` — 项目概览、技术栈、项目结构、API 接口、开发与部署指南
- `db/README.md` — 数据库表结构、初始化机制、迁移流程、导入导出
- `db/R2.md` — R2 对象存储规则、图标获取方式、Key 生成规则

## 技术栈速查

- **前端**: Vue 3 + TypeScript + Pinia + Vite 7 + Tailwind CSS 4
- **后端**: Cloudflare Pages Functions (Serverless)
- **数据库**: Cloudflare D1 (SQLite)
- **对象存储**: Cloudflare R2
- **认证**: JWT (jose)

## 关键约定

- SQL 文件 (`db/schema.sql`, `db/migrate.sql`, `db/seed.sql`) 是数据库的唯一事实来源
- 构建时 `scripts/generate-schema.js` 将 SQL 嵌入 `functions/lib/dbSchema.ts`
- Schema 变更后需同步更新 `db/migrate.sql` 和 `_middleware.ts` 中的 `EXPECTED_VERSION`
- 图标 Key 格式: `{domain}.{ext}`，由 `functions/lib/autoIcon.ts` 的 `getIconKey()` 生成
- 同分类同 URL 不可重复 (`UNIQUE(category, url)`)
- 所有服务端 fetch 需经过 SSRF 校验 (`functions/lib/urlValidation.ts`)
- **文档同步**：新增功能或任何功能性改动后，必须同步更新以下文档：
  - `README.md`
  - `db/README.md`
  - `db/R2.md`

## 开发命令

```bash
npm install              # 安装依赖
npm run dev              # 启动 Vite 前端
npx wrangler pages dev   # 启动后端（需同时运行）
npm run build            # 构建生产版本
npm run db:migrate:local # 本地数据库迁移
npm run db:seed:local    # 本地数据库种子数据
```

## 项目语言

代码注释和 commit message 使用中文。
