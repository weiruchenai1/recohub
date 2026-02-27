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
| 拖拽排序 | vue-draggable-plus (SortableJS) |
| 后端 | Cloudflare Pages Functions (Serverless) |
| 数据库 | Cloudflare D1 (SQLite) |
| 认证 | JWT (jose) |
| 部署 | Cloudflare Pages |

## 项目结构

```
recohub/
├── src/                          # 前端源码
│   ├── components/               # Vue 组件
│   │   ├── Navbar.vue            # 顶部导航栏（全局搜索、主题切换、账号菜单）
│   │   ├── AccountDropdown.vue   # 账号下拉菜单
│   │   ├── TabBar.vue            # 分类标签栏（动态分组）
│   │   ├── Toolbar.vue           # 工具栏（搜索、添加、视图切换）
│   │   ├── ItemTable.vue         # 列表视图容器
│   │   ├── ItemTableRow.vue      # 列表行组件
│   │   ├── ItemGrid.vue          # 网格视图容器
│   │   ├── ItemGridCard.vue      # 网格卡片组件
│   │   ├── ItemModal.vue         # 新增/编辑弹窗
│   │   ├── LoginModal.vue        # 登录弹窗
│   │   ├── SettingsModal.vue     # 系统设置弹窗（账号、个性化、分组管理）
│   │   ├── SearchDropdown.vue    # 搜索下拉结果
│   │   ├── PaginationBar.vue     # 分页控件
│   │   ├── FloatingToolbar.vue   # 浮动批量操作栏
│   │   ├── ConfirmDialog.vue     # 自定义确认弹窗
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
- [x] **分类浏览** - 动态分组管理，可自由添加、删除、重命名分组，标签切换
- [x] **分组拖拽排序** - 基于 vue-draggable-plus 的拖拽排序，支持拖拽手柄、动画过渡
- [x] **全局搜索** - 跨分类实时搜索，独立请求后端，支持名称、URL、备注模糊匹配，防抖优化
- [x] **局部搜索** - 当前分类内搜索过滤
- [x] **双视图模式** - 列表视图（表格）与网格视图（卡片），偏好持久化
- [x] **分页功能** - 可配置每页条数（10/20/50/100），智能分页导航，切换无闪烁
- [x] **多选与批量操作** - 复选框选择、全选/取消、批量删除、批量移动分类
- [x] **浮动操作栏** - 选中条目后显示浮动工具栏，支持编辑/移动/删除/取消
- [x] **用户认证** - 密码登录，JWT Token 鉴权（7天有效期）
- [x] **明暗主题** - 亮色/暗色主题切换，跟随系统偏好，持久化存储
- [x] **Favicon 展示** - 自动获取网站图标（Google S2 API + 降级方案），本地缓存7天
- [x] **响应式布局** - 适配桌面端与移动端
- [x] **状态持久化** - UI 偏好（主题、布局、分页、分组顺序等）保存到 localStorage
- [x] **个性化设置** - 可配置 LOGO 显示/隐藏、自定义文本、壁纸主题切换
- [x] **系统设置面板** - 统一的设置弹窗，含账号管理、个性化、分组管理
- [x] **账号菜单** - 导航栏用户图标，登录后显示下拉菜单快速访问设置
- [x] **URL 校验** - 后端 API 新增/编辑时校验 URL 格式，仅允许 http/https 协议
- [x] **后端 API** - 完整的 RESTful API，含认证中间件
- [x] **数据库设计** - D1 数据库表结构、索引与唯一约束（防重复插入）

### 待完成/可扩展

- [ ] 国际化（i18n）支持
- [ ] 数据导入/导出
- [ ] 用户注册与多用户支持
- [ ] 标签系统
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
# 终端 1: 启动 Wrangler（提供 API 和 D1 数据库）
npx wrangler pages dev

# 终端 2: 启动 Vite 前端（HMR 热更新）
npm run dev
```

然后访问 `http://localhost:5173`。Vite 会将 `/api` 请求自动代理到 Wrangler。

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

## 部署到 Cloudflare Pages

### 方式一：Fork 部署（推荐）

无需安装任何工具，全程在浏览器中完成。

**1. Fork 并创建项目**

- Fork 本仓库到自己的 GitHub 账号
- 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers 和 Pages** → **创建应用程序** → **Continue with GitHub**
- 选择 Fork 的仓库 → **下一步**
- 构建命令填 `npm run build`
- 展开 **高级设置**，在底部的环境变量区域添加（点击 **+ 添加变量** 增加第二条，均勾选 **加密**）：

| 变量名称 | 变量值 |
|----------|--------|
| `AUTH_PASSWORD` | 自定义管理员登录密码 |
| `JWT_SECRET` | 随机字符串（建议 32 位以上） |

- 点击 **部署**

**2. 创建 D1 数据库并绑定**

- 进入 Dashboard 左侧 **存储和数据库** → **D1 SQL 数据库** → **+ 创建数据库**
- 名称填 `recohub-db`，数据位置保持默认，点击 **创建**
- 返回项目页面 → **设置** → **绑定** → **添加**：

| 类型 | 名称 | 值 |
|------|------|-----|
| D1 数据库 | `DB` | `recohub-db` |

**3. 重新部署**

进入 **部署** → 找到最新的部署 → **重试部署**。

> 数据库会在首次访问时自动建表并填充种子数据，无需手动初始化。

### 方式二：CLI 部署

适合本地开发者，需要安装 Node.js 和项目依赖。

**1. 登录并创建 D1 数据库**

```bash
npx wrangler login
npx wrangler d1 create recohub-db
```

将输出的 `database_id` 替换 `wrangler.toml` 中的占位值（`placeholder-replace-with-actual-id`）。

**2. 首次部署**

```bash
npm run build
npx wrangler pages deploy dist
```

**3. 配置密钥与绑定**

进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 项目页面 → **设置**，按方式一的第 3 步配置变量和绑定。

**4. 重新部署生效**

```bash
npm run build
npx wrangler pages deploy dist
```

### 部署完成

访问 Cloudflare 分配的域名（格式为 `https://recohub.pages.dev`）即可使用。

如需绑定自定义域名，进入项目页面 → **自定义域** → **设置自定义域**。

### 后续更新

连接 Git 部署的项目，每次推送代码会自动触发构建。也可以手动部署：

```bash
npm run build
npx wrangler pages deploy dist
```
