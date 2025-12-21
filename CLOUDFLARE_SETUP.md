# Cloudflare D1 数据库配置指南

## 第一步:创建D1数据库

1. 登录你的Cloudflare账户
2. 进入 **Workers & Pages** > **D1**
3. 点击 **Create database**
4. 数据库名称输入: `webgis-hnnu-database`
5. 点击 **Create**

## 第二步:创建数据库表（D1）

在D1数据库控制台中执行以下SQL语句:

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- POI评论表
CREATE TABLE IF NOT EXISTS poi_comments (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- POI评分统计表(用于快速查询)
CREATE TABLE IF NOT EXISTS poi_ratings (
  poi_id TEXT PRIMARY KEY,
  total_ratings INTEGER DEFAULT 0,
  average_rating REAL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户头像（R2 对象元数据；图片二进制存 R2，不存 D1）
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 评论图片（R2 对象元数据）
CREATE TABLE IF NOT EXISTS poi_comment_images (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES poi_comments(id)
);

-- 打卡（定位 + 文字 + 1张图片；图片二进制存 R2）
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  text TEXT,
  image_object_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_poi_comments_poi_id ON poi_comments(poi_id);
CREATE INDEX idx_poi_comments_user_id ON poi_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_poi_comment_images_comment_id ON poi_comment_images(comment_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);
```

## 第三步:创建 R2 存储桶（用于头像/评论图片）

1. 登录你的 Cloudflare 账户
2. 进入 **R2**
3. 点击 **Create bucket**
4. 创建桶名（例如你已经创建的）：`webgis-hnnu-media`

说明：你不需要开启“公开访问”，也不需要配置自定义域；本项目通过 Worker 的 `/api/files/:key` 代理读取图片。

## 第四步:在 Worker 中绑定 D1 + R2

本项目使用 [worker/wrangler.jsonc](worker/wrangler.jsonc) 配置绑定：

- `d1_databases.binding` 必须为 `DB`
- `r2_buckets.binding` 必须为 `R2`
- `r2_buckets.bucket_name` 必须与你创建的 R2 存储桶同名（例如 `webgis-hnnu-media`）

注意：这里不需要 S3 API 信息。S3 API 仅用于外部程序/SDK 通过 S3 协议访问 R2；Worker 通过 R2 binding 直接访问。

## 第五步:部署 Cloudflare Worker

1. 在项目根目录创建 `worker` 文件夹
2. 在 `worker` 文件夹中运行以下命令初始化Worker项目:

```bash
cd worker
npm create cloudflare@latest
```

选择:
- Type: "Hello World" Worker
- TypeScript: Yes
- Git: Yes
- Deploy: No (稍后部署)

3. 安装依赖:

```bash
npm install
npm install @cloudflare/workers-types --save-dev
npm install uuid
```

4. 将 `worker/src/index.ts` 替换为API代码(见下方)

5. 如需修改允许跨域的前端域名：更新 [worker/wrangler.jsonc](worker/wrangler.jsonc) 里的 `vars.ALLOWED_ORIGINS`。

你部署到 Cloudflare Pages 后，请把 Pages 域名（例如 `https://xxx.pages.dev`）追加进去，否则前端 `fetch` 上传会被 CORS 拦截。

### 部署命令

```bash
cd worker
npx wrangler deploy
```

部署后你会得到Worker的URL,类似: `https://hnnu-webgis-api.你的账户.workers.dev`

## 第五步:更新前端API配置

在项目中创建 `src/api/config.ts`:

```typescript
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://hnnu-webgis-api.你的账户.workers.dev'
  : 'http://localhost:8787'
```

## 第六步:本地开发

1. 在 `worker` 目录运行:
```bash
npx wrangler dev
```

2. 在项目根目录运行前端开发服务器:
```bash
npm run dev
```

## API端点说明

- POST `/api/auth/register` - 用户注册
- POST `/api/auth/login` - 用户登录
- POST `/api/poi/comment` - 提交POI评论
- GET `/api/poi/:poiId/comments` - 获取POI评论列表
- GET `/api/poi/:poiId/rating` - 获取POI平均评分
- POST `/api/photo/upload` - 上传照片(需要配置R2存储)

## 注意事项

1. 密码使用bcrypt加密存储
2. 使用JWT进行用户认证
3. 需要配置CORS以允许前端访问
4. 照片上传需要额外配置Cloudflare R2存储桶
