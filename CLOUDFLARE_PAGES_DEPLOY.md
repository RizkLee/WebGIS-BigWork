# Cloudflare Pages 部署说明

本文档解释如何正确部署此项目到 Cloudflare Pages。

## 项目结构说明

此项目包含两个部分：

1. **前端应用**（根目录）：Vue 3 + Vite 静态网站 → 部署到 **Cloudflare Pages**
2. **后端 API**（`worker/` 目录）：Cloudflare Worker → 部署为 **Cloudflare Worker**

## 部署前端到 Cloudflare Pages

### ❌ 错误的命令

**不要使用**：
```bash
npx wrangler deploy --assets=./dist
```

这个命令会导致以下错误：
```
✘ [ERROR] A compatibility_date is required when publishing
```

**原因**：`wrangler deploy --assets` 是用于部署 Workers with Assets 的命令，不是用于部署 Cloudflare Pages 的正确方法。

### ✅ 正确的部署方法

#### 方法 1：使用 Cloudflare Pages 控制台（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create application** → **Pages** → **Connect to Git**
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **项目名称**: `hnnu-welcome`
   - **生产分支**: `main`
   - **框架预设**: `Vite`
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **部署命令**: **留空**（不要填写任何内容）
6. 点击 **Save and Deploy**

#### 方法 2：使用 Wrangler CLI

```bash
# 1. 构建项目
npm run build

# 2. 部署到 Pages
npx wrangler pages deploy dist --project-name=hnnu-welcome
```

**注意**：使用 `wrangler pages deploy` 而不是 `wrangler deploy --assets`。

## 部署后端 Worker

后端 Worker 的部署是独立的：

```bash
cd worker
npx wrangler deploy
```

Worker 配置文件在 `worker/wrangler.jsonc`，已经包含了 `compatibility_date` 等必要配置。

## wrangler.toml 配置说明

项目根目录的 `wrangler.toml` 文件包含以下配置：

```toml
name = "hnnu-welcome"
compatibility_date = "2025-12-21"
pages_build_output_dir = "dist"
```

这个配置文件：
- 提供了 `compatibility_date` 以满足 Wrangler 的要求
- 指定了 Pages 构建输出目录为 `dist`
- 主要用于使用 CLI 部署时的配置参考

## 常见问题

### Q: 为什么会出现 "compatibility_date is required" 错误？

A: 因为使用了错误的部署命令。应该使用 `wrangler pages deploy` 而不是 `wrangler deploy --assets`。

### Q: 我应该如何设置 Cloudflare Pages 的部署命令？

A: 在 Cloudflare Pages 控制台的设置中：
- **构建命令**: `npm run build`
- **构建输出目录**: `dist`
- **部署命令**: 留空（不填写）

### Q: Frontend 和 Worker 需要分别部署吗？

A: 是的，它们是两个独立的部署：
- Frontend（根目录）→ Cloudflare Pages
- Worker（worker/ 目录）→ Cloudflare Workers

## 更多信息

详细的部署步骤请参考：
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 完整部署指南
- [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) - Cloudflare 服务配置

## 快速参考

| 部署内容 | 命令 | 配置文件 |
|---------|------|---------|
| Frontend Pages | `npx wrangler pages deploy dist --project-name=hnnu-welcome` | `wrangler.toml` |
| Backend Worker | `cd worker && npx wrangler deploy` | `worker/wrangler.jsonc` |
