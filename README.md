# Travian游戏助手 (Travian Game Assistant)

## 项目简介 (Project Introduction)

这是一个为Travian游戏开发的油猴脚本（Tampermonkey）辅助工具，旨在提供更好的游戏体验和信息管理。

This is a Tampermonkey userscript assistant tool for the Travian game, designed to provide a better gaming experience and information management.

## 功能特性 (Features)

### 资源管理 (Resource Management)
- 实时收集和记录资源信息
- 跟踪资源产量和库存
- 可配置的数据更新间隔

### 建筑管理 (Building Management)
- 资源建筑信息收集
- 建筑升级详情页面增强
- 显示建筑升级成本和条件

### 游戏信息面板 (Game Information Panels)
- 可拖动的悬浮面板
- 显示玩家基本信息
- 快捷键控制

## 安装说明 (Installation)

### 前提条件 (Prerequisites)
- 安装 Tampermonkey 浏览器扩展
  - Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejfjfheaglbedfg)
  - Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)

### 安装步骤 (Installation Steps)
1. 打开 Tampermonkey 控制面板
2. 点击"实用工具"标签
3. 选择"从 URL 安装"
4. 输入 GitHub 脚本的 RAW 地址
5. 确认安装

## 使用说明 (Usage)

### 快捷键 (Shortcuts)
- `Ctrl + Shift + R`: 开启/关闭资源面板
- `Ctrl + Shift + Q`: 完全关闭助手

### 配置 (Configuration)
可以在控制台动态调整设置：

```javascript
// 调整资源数据更新间隔（分钟）
TravianAssistant.setResourceDataUpdateInterval(15);

// 调整建筑信息更新间隔（秒）
TravianAssistant.setResourceBuildingUpdateInterval(60);
```

## 技术栈 (Tech Stack)
- JavaScript
- Tampermonkey
- DOM 操作
- 响应式设计

## 开发 (Development)

### 本地开发 (Local Development)
1. 克隆仓库
2. 使用 Tampermonkey 加载 `travian_fuzhu.user.js`
3. 在 Travian 游戏页面测试

### 贡献 (Contributing)
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m '添加了某个特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证 (License)
基于 MIT 许可证开源。详见 `LICENSE` 文件。

## 免责声明 (Disclaimer)
本项目仅用于学习和研究目的。使用本脚本可能违反游戏规则，请谨慎使用。

## 联系方式 (Contact)
- 项目地址: [GitHub仓库链接]
- 问题反馈: [创建 Issue]

## 鸣谢 (Acknowledgments)
感谢 Travian 游戏和开源社区。 