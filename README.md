# ChatBI MVP - 对话式商业智能系统

ChatBI MVP是一个纯前端的对话式商业智能系统，通过集成智谱GLM模型提供自然语言数据分析能力。用户可以上传数据文件，然后通过自然语言对话的方式进行数据分析和可视化。

## ✨ 功能特性

### 🤖 智能对话分析
- 支持自然语言查询数据
- 智能理解用户意图
- 上下文对话支持
- 错误重试机制

### 📊 数据处理
- 支持 CSV、Excel 文件上传
- 自动数据类型推断
- 数据质量评估
- 数据预览和统计

### 📈 图表生成
- 智能图表类型推荐
- 支持柱状图、折线图、饼图、散点图等
- 图表导出功能
- 交互式图表展示

### ⚙️ 配置管理
- 支持智谱GLM-4.5和GLM-4.5-air模型
- API密钥安全存储
- 用户偏好设置
- 主题切换

### 🔒 数据安全
- 所有数据处理在本地完成
- 不上传原始数据到服务器
- API密钥加密存储
- 可清除本地数据

## 🚀 快速开始

### 环境要求

- Node.js 16.0 或更高版本
- npm 7.0 或更高版本

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产环境构建

```bash
npm run build
```

构建文件将生成在 `dist` 目录中。

### 预览生产构建

```bash
npm run preview
```

## 📋 使用指南

### 1. 配置API密钥

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/) 注册账号
2. 创建API密钥
3. 在应用的设置页面中配置API密钥

### 2. 上传数据

1. 点击"上传数据"按钮
2. 选择CSV或Excel文件（最大50MB）
3. 等待文件处理完成
4. 查看数据预览和统计信息

### 3. 开始对话

1. 确保已上传数据并配置API密钥
2. 在聊天界面输入问题，例如：
   - "这个数据集有多少行数据？"
   - "帮我生成一个销售额的柱状图"
   - "分析一下客户的年龄分布"
   - "哪个产品类别销量最高？"

### 4. 生成图表

- AI会根据分析结果自动推荐合适的图表
- 也可以在图表页面手动生成各种类型的图表
- 支持导出图表为PNG或SVG格式

## 🏗️ 技术架构

### 前端技术栈

- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速的构建工具
- **Ant Design** - UI组件库
- **Zustand** - 轻量级状态管理
- **ECharts** - 数据可视化图表库

### 核心服务

- **aiService** - 智谱GLM API集成
- **dataService** - 数据文件解析和处理
- **chartService** - 图表生成和配置
- **storageService** - 本地数据存储

### 数据处理

- **Papa Parse** - CSV文件解析
- **SheetJS** - Excel文件处理
- **IndexedDB** - 大数据本地存储
- **LocalStorage** - 配置信息存储

## 📁 项目结构

```
src/
├── components/           # React组件
│   ├── Chat/            # 聊天相关组件
│   ├── DataUpload/      # 数据上传组件
│   ├── Visualization/   # 图表可视化组件
│   ├── Settings/        # 设置配置组件
│   └── Layout/          # 布局组件
├── services/            # 业务服务层
│   ├── aiService.ts     # AI服务
│   ├── dataService.ts   # 数据服务
│   ├── chartService.ts  # 图表服务
│   └── storageService.ts # 存储服务
├── stores/              # 状态管理
│   ├── chatStore.ts     # 聊天状态
│   ├── dataStore.ts     # 数据状态
│   ├── settingsStore.ts # 设置状态
│   └── uiStore.ts       # UI状态
├── types/               # TypeScript类型定义
├── utils/               # 工具函数
└── App.tsx              # 主应用组件
```

## 🔧 配置说明

### 环境变量

项目支持以下环境变量配置：

```bash
# 开发环境端口
VITE_PORT=3000

# API基础URL（可选）
VITE_API_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

### 支持的文件格式

- **CSV** - 逗号分隔值文件
- **Excel** - .xlsx 和 .xls 格式

### 文件大小限制

- 最大文件大小：50MB
- 建议数据行数：< 100,000行

## 🚨 常见问题

### API密钥相关

**Q: 如何获取智谱AI的API密钥？**

A: 访问 [智谱AI开放平台](https://open.bigmodel.cn/)，注册账号后在控制台创建API密钥。

**Q: API密钥安全吗？**

A: API密钥使用Base64编码存储在浏览器本地，不会发送到第三方服务器。

### 数据处理

**Q: 支持哪些数据格式？**

A: 目前支持CSV和Excel (.xlsx, .xls) 格式的文件。

**Q: 数据会上传到服务器吗？**

A: 不会。所有数据处理都在浏览器本地完成，保护您的数据隐私。

### 图表生成

**Q: 为什么生成的图表不符合预期？**

A: 可以尝试：
1. 重新描述需求，提供更具体的信息
2. 手动在图表页面生成指定类型的图表
3. 检查数据格式是否正确

## 🤝 贡献指南

欢迎贡献代码或提出改进建议！

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 组件命名使用 PascalCase
- 函数命名使用 camelCase

## 📄 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- [智谱AI](https://open.bigmodel.cn/) - 提供AI模型服务
- [Ant Design](https://ant.design/) - UI组件库
- [ECharts](https://echarts.apache.org/) - 图表可视化
- [React](https://reactjs.org/) - 前端框架

---

如有问题或建议，欢迎提交 Issue 或联系开发者。
