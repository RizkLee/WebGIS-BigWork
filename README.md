# 湖南师范大学欢迎网页

欢迎来到湖南师范大学!本项目是一个为新生和在校生提供校园服务指南的网页应用。

![HNNU Logo](https://pan.hunnu.edu.cn/media/custom/mylogo.png)

## ✨ 特性

- 🎓 **校园服务导航** - 整合学校各类官方网站和服务平台
- 📚 **实用官网官微** - 快速访问图书馆、教务系统、云盘等
- 🏫 **校园生活指南** - 周边美食、交通通勤等实用信息
- 📱 **移动端适配** - 响应式设计,支持各种设备
- 🎨 **清新界面** - 简洁优雅的UI设计

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173` 查看效果

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 📂 项目结构

```
src/
├── components/          # Vue组件
│   ├── SiteHeader.vue      # 网站头部
│   ├── ContentSection.vue  # 内容板块
│   ├── SectionItem.vue     # 可展开条目
│   └── QRButton.vue        # 二维码按钮
├── data/               # 数据配置
│   └── sections.ts         # 所有内容数据
├── types/              # TypeScript类型
│   └── index.ts
├── App.vue             # 主应用组件
├── main.ts             # 应用入口
└── style.css           # 全局样式

public/
└── Pictures/           # 静态资源
```

## 📖 开发文档

- [📋 开发指南.md](./开发指南.md) - 如何添加内容和修改样式
- [🔄 MIGRATION.md](./MIGRATION.md) - 项目迁移说明和组件详解
- [✅ 迁移完成总结.md](./迁移完成总结.md) - 完整的功能列表

## 🎯 快速添加内容

编辑 `src/data/sections.ts`,按照以下格式添加:

```typescript
{
  title: '板块标题',
  items: [
    {
      title: '条目标题',
      links: [
        { type: 'link', text: '访问', url: 'https://example.com' },
        { type: 'qr', text: '二维码', qrImage: '/Pictures/qr.jpg' }
      ],
      description: '描述内容'
    }
  ]
}
```

## 🛠️ 技术栈

- **框架**: Vue 3
- **语言**: TypeScript
- **构建工具**: Vite
- **样式**: CSS (模块化)

## 📝 主要功能

### 实用官网官微
- 校园网登录
- 图书馆系统
- 教务管理平台
- 在线教学平台
- 校园云盘
- EDU邮箱
- 学信网

### 学校热门论坛
- 师大论坛
- 青年师大

### 学校周边好店
- 美食推荐
- 位置导航

### 校园通勤指南
- 各校区交通
- 公交路线
- 校车时刻

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进这个项目!

## 📄 许可

本项目仅供学习交流使用。

## 🔗 相关链接

- [湖南师范大学官网](https://www.hunnu.edu.cn/)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)

---

Made with ❤️ for HNNU Students
