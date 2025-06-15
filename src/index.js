// index.js - 主入口文件
import { Core } from './core/Core.js';
import { ResourceManager } from './managers/ResourceManager.js';
import { BuildingQueueManager } from './managers/BuildingQueueManager.js';
import { BuildingDetailManager } from './managers/BuildingDetailManager.js';
import { UIManager } from './ui/UIManager.js';
import { Utils } from './utils/Utils.js';

// 注册所有模块
Core.registerModule('resource', ResourceManager);
Core.registerModule('buildingQueue', BuildingQueueManager);
Core.registerModule('buildingDetail', BuildingDetailManager);
Core.registerModule('ui', UIManager);
Core.registerModule('utils', Utils);

// 初始化应用
Core.init();

// 导出模块供外部使用
export {
    Core,
    ResourceManager,
    BuildingQueueManager,
    BuildingDetailManager,
    UIManager,
    Utils
}; 