# Travian Game Assistant

一个用于 Travian 游戏的浏览器助手脚本，帮助玩家更高效地管理资源和建筑。

## 功能特点

- 资源监控：实时显示资源库存和产量
- 建筑队列管理：自动管理建筑升级队列
- 资源积累预测：计算资源积累所需时间
- 智能升级：自动检查资源并执行建筑升级
- 美观的界面：简洁直观的用户界面

## 安装方法

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 [安装脚本](https://raw.githubusercontent.com/your-username/travian-game-assistant/main/travian_fuzhu.user.js)
3. 在 Tampermonkey 中确认安装

## 使用方法

1. 登录 Travian 游戏
2. 脚本会自动在右上角显示资源面板
3. 在建筑页面可以查看升级所需资源和等待时间
4. 建筑队列会自动管理升级顺序

## 模块说明

- `Core.js`: 核心模块，负责模块注册和初始化
- `Utils.js`: 工具函数模块，提供通用功能
- `ResourceManager.js`: 资源管理模块，处理资源相关操作
- `BuildingQueueManager.js`: 建筑队列管理模块，处理建筑升级队列
- `BuildingDetailManager.js`: 建筑详情管理模块，处理建筑升级逻辑
- `UIManager.js`: UI管理模块，处理界面显示

## 开发说明

### 项目结构

```
travian-game-assistant/
├── src/
│   ├── core/
│   │   └── Core.js
│   ├── utils/
│   │   └── Utils.js
│   ├── managers/
│   │   ├── ResourceManager.js
│   │   ├── BuildingQueueManager.js
│   │   └── BuildingDetailManager.js
│   └── ui/
│       └── UIManager.js
├── travian_fuzhu.user.js
├── README.md
└── LICENSE
```

### 本地开发

1. 克隆仓库
```bash
git clone https://github.com/your-username/travian-game-assistant.git
```

2. 修改代码
3. 测试更改
4. 提交并推送更改

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v0.1
- 初始版本发布
- 实现基本功能：
  - 资源监控
  - 建筑队列管理
  - 资源积累预测
  - 智能升级 