# 部署到Cloudflare Pages指南

## 准备工作

确保你已经:
1. 创建了Cloudflare账户
2. 安装了Git
3. 项目代码已推送到GitHub仓库

## 步骤1: 部署Cloudflare Worker

1. 进入 `worker` 目录:
```bash
cd worker
```

2. 安装wrangler CLI (如果还没安装):
```bash
npm install -g wrangler
```

3. 登录Cloudflare:
```bash
wrangler login
```

4. 获取D1数据库ID:
   - 访问Cloudflare控制台
   - 进入 **Workers & Pages** > **D1**
   - 找到你创建的 `webgis-hnnu-database`
   - 复制数据库ID

5. 更新 `wrangler.toml` 中的 `database_id`

6. 部署Worker:
```bash
wrangler deploy
```

7. 记下部署后的Worker URL (类似: `https://hnnu-webgis-api.你的账户.workers.dev`)

## 步骤2: 更新前端API配置

1. 打开 `src/api/client.ts`

2. 将Worker URL更新到配置中:
```typescript
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://hnnu-webgis-api.你的账户.workers.dev' // 替换为实际URL
  : 'http://localhost:8787'
```

3. 提交更改到Git:
```bash
git add .
git commit -m "Update API URL for production"
git push
```

## 步骤3: 部署到Cloudflare Pages

### 方法1: 通过Cloudflare控制台 (推荐)

1. 登录Cloudflare控制台

2. 进入 **Workers & Pages**

3. 点击 **Create application** > **Pages** > **Connect to Git**

4. 授权Cloudflare访问你的GitHub账户

5. 选择你的项目仓库 `HNNU_Welcome`

6. 配置构建设置:
   - **项目名称**: `hnnu-welcome` (或你喜欢的名称)
   - **生产分支**: `main`
   - **框架预设**: `Vite`
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **部署命令**: 留空（不要填写 `npx wrangler deploy --assets=./dist`）

7. 点击 **Save and Deploy**

8. 等待构建完成 (通常需要1-3分钟)

9. 部署完成后,你会得到一个URL: `https://hnnu-welcome.pages.dev`

### 方法2: 使用Wrangler CLI

1. 在项目根目录运行:
```bash
npm run build
```

2. 部署到Pages (使用 pages 子命令):
```bash
npx wrangler pages deploy dist --project-name=hnnu-welcome
```

**注意**: 请使用 `wrangler pages deploy` 而不是 `wrangler deploy --assets`。前者是专门用于 Cloudflare Pages 的命令。

## 步骤4: 更新Worker的CORS配置

1. 编辑 `worker/wrangler.jsonc`,添加Pages域名到允许的源:
```jsonc
{
  // ...其他配置
  "vars": {
    "ALLOWED_ORIGINS": "http://localhost:5173,https://hnnu-welcome.pages.dev,https://你的自定义域名.com"
  }
}
```

2. 重新部署Worker:
```bash
cd worker
wrangler deploy
```

## 步骤5: (可选) 配置自定义域名

1. 在Cloudflare Pages项目页面,点击 **Custom domains**

2. 点击 **Set up a custom domain**

3. 输入你的域名 (如 `webgis.yourdomain.com`)

4. 按照提示添加DNS记录

5. 等待SSL证书自动配置完成

## 步骤6: 测试部署

1. 访问你的Pages URL

2. 测试以下功能:
   - 地图加载
   - POI点显示
   - 用户注册/登录
   - POI评论和评分

## 常见问题

### 使用 `npx wrangler deploy --assets=./dist` 命令失败

**错误信息**: `A compatibility_date is required when publishing`

**原因**: `wrangler deploy --assets` 是用于部署 Workers with Assets 的命令，不是用于 Cloudflare Pages 的正确命令。

**解决方案**: 
1. **推荐方式**: 使用 Cloudflare Pages 控制台连接 GitHub 仓库（见方法1）
2. **CLI方式**: 使用 `wrangler pages deploy` 命令:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=hnnu-welcome
   ```

项目根目录的 `wrangler.toml` 文件提供了必要的配置（包括 `compatibility_date`），使 CLI 部署时能够正常工作。如果使用 Cloudflare Pages 控制台部署，则不需要此文件。

### 构建失败

- 检查 `package.json` 中的依赖是否完整
- 确保Node版本兼容 (建议使用v18或更高)
- 查看构建日志中的错误信息

### API请求失败

- 确认Worker已成功部署
- 检查CORS配置是否包含Pages域名
- 检查浏览器控制台的网络请求

### 数据库连接问题

- 确认D1数据库已创建
- 检查 `wrangler.toml` 中的 `database_id` 是否正确
- 确认SQL表已创建

## 后续优化

1. **启用分析**: 在Pages设置中启用Web Analytics

2. **配置环境变量**: 
   - 在Pages项目设置中添加环境变量
   - 用于API密钥等敏感信息

3. **设置构建缓存**: 加快后续部署速度

4. **配置预览部署**: 为每个Pull Request自动创建预览环境

5. **性能优化**:
   - 启用Cloudflare CDN
   - 配置缓存规则
   - 优化图片资源

## 监控和维护

- 定期检查Pages的部署日志
- 监控Worker的请求量和错误率
- 定期备份D1数据库
