# RecoHub - 推荐列表

一个基于 Vue 3 + Cloudflare Pages 的全栈推荐列表应用，用于管理和展示精选的软件与网站推荐。

## 项目概览

RecoHub 提供了一个简洁美观的界面，用于组织和分享精选的软件和网站推荐列表。支持搜索、筛选、批量操作以及明暗主题切换。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + `<script setup>` |
| 状态管理 | Pinia |
| 构建工具 | Vite 7 |
| CSS 方案 | Tailwind CSS 4 |
| 后端 | Cloudflare Pages Functions (Serverless) |
| 数据库 | Cloudflare D1 (SQLite) |
| 认证 | JWT (jose) |
| 部署 | Cloudflare Pages |

## 项目结构

```
recommend-list/
├── src/                          # 前端源码
│   ├── components/               # Vue 组件
│   │   ├── Navbar.vue            # 顶部导航栏（全局搜索、主题切换）
│   │   ├── TabBar.vue            # 分类标签栏（软件/网站）
│   │   ├── Toolbar.vue           # 工具栏（搜索、添加、视图切换）
│   │   ├── ItemTable.vue         # 列表视图容器
│   │   ├── ItemTableRow.vue      # 列表行组件
│   │   ├── ItemGrid.vue          # 网格视图容器
│   │   ├── ItemGridCard.vue      # 网格卡片组件
│   │   ├── ItemModal.vue         # 新增/编辑弹窗
│   │   ├── LoginModal.vue        # 登录弹窗
│   │   ├── SearchDropdown.vue    # 搜索下拉结果
│   │   ├── PaginationBar.vue     # 分页控件
│   │   ├── FloatingToolbar.vue   # 浮动批量操作栏
│   │   ├── ThemeToggle.vue       # 主题切换按钮
│   │   └── CustomCheckbox.vue    # 自定义复选框
│   ├── stores/                   # Pinia 状态管理
│   │   ├── auth.ts               # 认证状态
│   │   ├── ui.ts                 # UI 状态（主题、布局、分页等）
│   │   └── items.ts              # 数据状态（列表增删改查）
│   ├── composables/              # 组合式函数
│   │   ├── useFavicon.ts         # Favicon 获取与缓存
│   │   ├── useDebounce.ts        # 防抖
│   │   └── useClickOutside.ts    # 点击外部检测
│   ├── lib/                      # 工具库
│   │   └── api.ts                # API 客户端封装
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts              # 全局类型
│   ├── App.vue                   # 根组件
│   ├── main.ts                   # 应用入口
│   └── style.css                 # 全局样式与主题变量
│
├── functions/                    # 后端 API（Cloudflare Pages Functions）
│   └── api/
│       ├── _middleware.ts        # JWT 认证中间件
│       ├── login.ts              # 登录接口
│       └── items/
│           ├── index.ts          # 列表查询 / 新增
│           ├── [id].ts           # 单条编辑 / 删除
│           └── batch.ts          # 批量操作（删除/移动）
│
├── db/                           # 数据库
│   ├── schema.sql                # 表结构定义
│   └── seed.sql                  # 初始种子数据
│
├── wrangler.toml                 # Cloudflare 配置
├── vite.config.ts                # Vite 构建配置
├── tsconfig.json                 # TypeScript 配置
└── package.json                  # 项目依赖
```

## 功能完成情况

### 已完成功能

- [x] **数据管理** - 推荐条目的增删改查（CRUD）
- [x] **分类浏览** - 软件推荐 / 网站推荐两大分类，标签切换
- [x] **全局搜索** - 跨分类实时搜索，独立请求后端，支持名称、URL、备注模糊匹配
- [x] **局部搜索** - 当前分类内搜索过滤
- [x] **双视图模式** - 列表视图（表格）与网格视图（卡片），偏好持久化
- [x] **分页功能** - 可配置每页条数（10/20/50/100），智能分页导航，切换无闪烁
- [x] **多选与批量操作** - 复选框选择、全选/取消、批量删除、批量移动分类
- [x] **浮动操作栏** - 选中条目后显示浮动工具栏，支持编辑/移动/删除/取消
- [x] **用户认证** - 密码登录，JWT Token 鉴权（7天有效期）
- [x] **明暗主题** - 亮色/暗色主题切换，跟随系统偏好，持久化存储
- [x] **Favicon 展示** - 自动获取网站图标（Google S2 API + 降级方案），本地缓存7天
- [x] **响应式布局** - 适配桌面端与移动端
- [x] **状态持久化** - UI 偏好（主题、布局、分页等）保存到 localStorage
- [x] **后端 API** - 完整的 RESTful API，含认证中间件
- [x] **数据库设计** - D1 数据库表结构、索引与唯一约束（防重复插入）

### 待完成/可扩展

- [ ] 拖拽排序功能（sort_order 字段已预留）
- [ ] 国际化（i18n）支持
- [ ] 数据导入/导出
- [ ] 用户注册与多用户支持
- [ ] 标签/分组系统
- [ ] 评分/评论功能

## API 接口

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `POST` | `/api/login` | 登录获取 Token | 否 |
| `GET` | `/api/items` | 获取列表（支持分页、搜索、分类筛选，category 可选） | 否 |
| `POST` | `/api/items` | 新增条目（自动去重，同分类同 URL 返回 409） | 是 |
| `PUT` | `/api/items/:id` | 编辑条目 | 是 |
| `DELETE` | `/api/items/:id` | 删除条目 | 是 |
| `POST` | `/api/items/batch` | 批量操作（删除/移动） | 是 |

## 本地开发

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 初始化本地数据库

```bash
npx wrangler d1 execute recohub-db --local --file=db/schema.sql
npx wrangler d1 execute recohub-db --local --file=db/seed.sql
```

种子数据使用 `INSERT OR IGNORE`，重复执行不会产生重复记录。

### 启动开发服务器

需要两个终端同时运行：

```bash
# 终端 1: 启动 Vite 前端（HMR 热更新）
npm run dev

# 终端 2: 启动 Wrangler 代理（提供 API 和 D1 数据库）
npx wrangler pages dev --proxy=5173
```

然后访问 `http://127.0.0.1:8788`。

> 需要在项目根目录创建 `.dev.vars` 文件配置本地环境变量：
>
> ```
> AUTH_PASSWORD=你的密码
> JWT_SECRET=你的密钥
> ```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run build && npx wrangler pages dev dist
```

## 部署

项目部署到 Cloudflare Pages，需要配置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `AUTH_PASSWORD` | 管理员登录密码 |
| `JWT_SECRET` | JWT 签名密钥 |

D1 数据库需要在 Cloudflare Dashboard 中创建，并将 `database_id` 更新到 `wrangler.toml` 中。

### 初始化数据库

```bash
# 本地开发
npx wrangler d1 execute recohub-db --local --file=db/schema.sql
npx wrangler d1 execute recohub-db --local --file=db/seed.sql

# 远程（生产）
npx wrangler d1 execute recohub-db --remote --file=db/schema.sql
npx wrangler d1 execute recohub-db --remote --file=db/seed.sql
```

如需重置数据库：

```bash
npx wrangler d1 execute recohub-db --local --command="DROP TABLE IF EXISTS items;"
npx wrangler d1 execute recohub-db --local --file=db/schema.sql
npx wrangler d1 execute recohub-db --local --file=db/seed.sql
```

## 项目进度总结

本项目的核心功能已 **全部完成**，包括前端界面、后端 API、数据库设计、认证系统和主题系统。代码结构清晰，类型安全，无残留 TODO 或 FIXME 标记。项目已达到可部署上线的状态。
