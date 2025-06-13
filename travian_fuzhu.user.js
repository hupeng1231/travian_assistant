// ==UserScript==
// @name         Travian游戏助手
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Travian游戏辅助工具，支持多页面功能
// @match        https://*.travian.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 资源建筑类型映射
    const RESOURCE_BUILDING_TYPES = {
        1: '伐木场',
        2: '泥坑',
        3: '铁矿',
        4: '农田'
    };

    // 资源数据管理器
    const ResourceDataManager = {
        // 存储资源历史数据
        resourceHistory: {
            木材: [],
            粘土: [],
            铁: [],
            麦子: []
        },

        // 存储每小时产量数据
        productionHistory: {
            木材: [],
            粘土: [],
            铁: [],
            麦子: []
        },

        // 上次记录的时间戳
        lastRecordTimestamp: 0,

        // 更新间隔（毫秒）默认为15分钟
        UPDATE_INTERVAL: 15 * 60 * 1000,

        // 记录资源信息
        recordResourceData: function(resources, productionInfo) {
            const currentTime = new Date().getTime();

            // 检查是否达到更新间隔
            if (currentTime - this.lastRecordTimestamp < this.UPDATE_INTERVAL) {
                return;
            }

            // 更新最后记录时间戳
            this.lastRecordTimestamp = currentTime;

            // 记录资源库存
            for (const [resourceType, resourceData] of Object.entries(resources)) {
                const recordEntry = {
                    timestamp: currentTime,
                    库存: resourceData.库存,
                    仓库容量: resourceData.仓库容量 || resourceData.粮仓容量,
                    库存百分比: resourceData.库存百分比
                };

                this.resourceHistory[resourceType].push(recordEntry);

                // 限制历史记录长度，保留最近24条记录（约6小时）
                if (this.resourceHistory[resourceType].length > 24) {
                    this.resourceHistory[resourceType].shift();
                }
            }

            // 记录每小时产量
            for (const [resourceType, productionData] of Object.entries(productionInfo)) {
                const recordEntry = {
                    timestamp: currentTime,
                    每小时产量: productionData.每小时产量
                };

                this.productionHistory[resourceType].push(recordEntry);

                // 限制历史记录长度，保留最近24条记录（约6小时）
                if (this.productionHistory[resourceType].length > 24) {
                    this.productionHistory[resourceType].shift();
                }
            }
        },

        // 获取最近的资源数据
        getLatestResourceData: function(resourceType) {
            const history = this.resourceHistory[resourceType];
            return history.length > 0 ? history[history.length - 1] : null;
        },

        // 获取资源产量趋势
        getProductionTrend: function(resourceType) {
            const history = this.productionHistory[resourceType];
            if (history.length < 2) return null;

            const latestProduction = history[history.length - 1].每小时产量;
            const previousProduction = history[history.length - 2].每小时产量;

            return {
                当前产量: latestProduction,
                变化趋势: latestProduction > previousProduction ? '增加' : 
                         latestProduction < previousProduction ? '减少' : '稳定'
            };
        },

        // 导出数据（可用于持久化或分析）
        exportData: function() {
            return {
                resourceHistory: this.resourceHistory,
                productionHistory: this.productionHistory
            };
        },

        // 设置更新间隔（分钟）
        setUpdateInterval: function(minutes) {
            this.UPDATE_INTERVAL = minutes * 60 * 1000;
        }
    };

    // 资源建筑管理器
    const ResourceBuildingManager = {
        // 上次更新的时间戳
        lastUpdateTimestamp: 0,

        // 更新间隔（毫秒）默认为1分钟
        UPDATE_INTERVAL: 60 * 1000,

        // 缓存的建筑信息
        cachedBuildingInfo: null,

        // 收集资源建筑信息
        collectResourceBuildingInfo: function() {
            const currentTime = new Date().getTime();

            // 检查是否需要更新
            if (this.cachedBuildingInfo && 
                (currentTime - this.lastUpdateTimestamp < this.UPDATE_INTERVAL)) {
                return this.cachedBuildingInfo;
            }

            const resourceBuildings = {
                伐木场: [],
                泥坑: [],
                铁矿: [],
                农田: []
            };

            // 调试日志
            console.log('开始收集资源建筑信息');

            // 查找所有资源建筑
            const buildings = document.querySelectorAll('.resourceField[data-gid]');
            
            console.log(`找到资源建筑数量: ${buildings.length}`);

            buildings.forEach(building => {
                const gid = building.getAttribute('data-gid');
                const aid = building.getAttribute('data-aid');
                const levelEl = building.querySelector('.labelLayer');
                const currentLevel = levelEl ? parseInt(levelEl.textContent || 0) : 0;
                const buildUrl = building.getAttribute('href');
                const canUpgrade = building.classList.contains('notNow');

                const buildingInfo = {
                    类型: RESOURCE_BUILDING_TYPES[gid],
                    地块ID: aid,
                    当前等级: currentLevel,
                    建设链接: buildUrl,
                    可升级: canUpgrade
                };

                console.log('资源建筑信息:', buildingInfo);

                // 确保类型存在再添加
                if (RESOURCE_BUILDING_TYPES[gid]) {
                    resourceBuildings[RESOURCE_BUILDING_TYPES[gid]].push(buildingInfo);
                }
            });

            // 更新缓存和时间戳
            this.cachedBuildingInfo = resourceBuildings;
            this.lastUpdateTimestamp = currentTime;

            // 打印最终收集的建筑信息
            console.log('最终资源建筑信息:', resourceBuildings);

            return resourceBuildings;
        },

        // 设置更新间隔（秒）
        setUpdateInterval: function(seconds) {
            this.UPDATE_INTERVAL = seconds * 1000;
        },

        // 解析建筑升级详情页信息
        parseBuildingUpgradeDetailPage: function() {
            // 检查是否为建筑升级详情页
            const urlParams = new URLSearchParams(window.location.search);
            const buildingId = urlParams.get('id');
            const buildingType = urlParams.get('gid');

            if (!buildingId || !buildingType) {
                console.log('不是建筑升级详情页');
                return null;
            }

            // 建筑类型映射
            const buildingTypeNames = {
                '1': '伐木场',
                '2': '泥坑',
                '3': '铁矿',
                '4': '农田',
                // 可以根据需要添加更多建筑类型
            };

            // 收集建筑详细信息
            const buildingInfo = {
                地块ID: buildingId,
                建筑类型: buildingTypeNames[buildingType] || '未知',
                当前等级: this.getCurrentBuildingLevel(),
                升级成本: this.getBuildingUpgradeCost(),
                升级时间: this.getBuildingUpgradeTime(),
                升级条件: this.getUpgradeConditions()
            };

            console.log('建筑升级详情:', buildingInfo);
            return buildingInfo;
        },

        // 获取当前建筑等级
        getCurrentBuildingLevel: function() {
            const levelElement = document.querySelector('.buildingLevel');
            return levelElement ? parseInt(levelElement.textContent.replace(/[^\d]/g, ''), 10) : 0;
        },

        // 获取建筑升级成本
        getBuildingUpgradeCost: function() {
            const costElements = document.querySelectorAll('.resourceWrapper .resource');
            const costs = {};

            costElements.forEach((el, index) => {
                const resourceNames = ['木材', '粘土', '铁', '麦子'];
                const amount = el.querySelector('.value')?.textContent.trim();
                
                if (amount) {
                    costs[resourceNames[index]] = amount;
                }
            });

            return costs;
        },

        // 获取建筑升级时间
        getBuildingUpgradeTime: function() {
            const timeElement = document.querySelector('.buildDuration');
            return timeElement ? timeElement.textContent.trim() : '未知';
        },

        // 获取升级条件
        getUpgradeConditions: function() {
            const conditions = [];

            // 检查资源是否足够
            const resourceConditions = document.querySelectorAll('.resourceWrapper .resource.notEnough');
            resourceConditions.forEach(el => {
                const resourceName = el.closest('.resourceWrapper').querySelector('.resourceIcon')?.getAttribute('alt');
                conditions.push(`${resourceName}资源不足`);
            });

            // 检查其他升级条件
            const otherConditions = document.querySelectorAll('.errorMessage');
            otherConditions.forEach(el => {
                conditions.push(el.textContent.trim());
            });

            return conditions.length > 0 ? conditions : null;
        }
    };

    // 收集资源信息
    function collectResourceInfo() {
        const resources = {
            木材: {
                库存: document.querySelector('#l1.value')?.textContent || '0',
                仓库容量: document.querySelector('.warehouse .capacity .value')?.textContent || '0',
                库存百分比: document.querySelector('#lbar1.bar')?.style.width || '0%'
            },
            粘土: {
                库存: document.querySelector('#l2.value')?.textContent || '0',
                仓库容量: document.querySelector('.warehouse .capacity .value')?.textContent || '0',
                库存百分比: document.querySelector('#lbar2.bar')?.style.width || '0%'
            },
            铁: {
                库存: document.querySelector('#l3.value')?.textContent || '0',
                仓库容量: document.querySelector('.warehouse .capacity .value')?.textContent || '0',
                库存百分比: document.querySelector('#lbar3.bar')?.style.width || '0%'
            },
            麦子: {
                库存: document.querySelector('#l4.value')?.textContent || '0',
                粮仓容量: document.querySelector('.granary .capacity .value')?.textContent || '0',
                库存百分比: document.querySelector('#lbar4.bar')?.style.width || '0%',
                空闲粮食: document.querySelector('#stockBarFreeCrop')?.textContent || '0'
            }
        };

        // 收集每小时产量
        const productionInfo = collectResourceProductionInfo();

        // 记录资源数据
        ResourceDataManager.recordResourceData(resources, productionInfo);

        return resources;
    }

    // 收集每小时资源产量
    function collectResourceProductionInfo() {
        const production = {
            木材: {
                每小时产量: document.querySelector('tr:has(.r1) .num')?.textContent?.trim() || '0',
                图标类: 'r1'
            },
            粘土: {
                每小时产量: document.querySelector('tr:has(.r2) .num')?.textContent?.trim() || '0',
                图标类: 'r2'
            },
            铁: {
                每小时产量: document.querySelector('tr:has(.r3) .num')?.textContent?.trim() || '0',
                图标类: 'r3'
            },
            麦子: {
                每小时产量: document.querySelector('tr:has(.r4) .num')?.textContent?.trim() || '0',
                图标类: 'r4'
            }
        };
        return production;
    }

    // 计算预计仓库满库存时间
    function calculateStorageFullTime(currentStock, capacity, hourlyProduction) {
        // 转换为数字
        currentStock = parseInt(currentStock.replace(/[^\d]/g, ''), 10);
        capacity = parseInt(capacity.replace(/[^\d]/g, ''), 10);
        hourlyProduction = parseInt(hourlyProduction.replace(/[^\d]/g, ''), 10);

        // 如果产量为0，返回无法计算
        if (hourlyProduction === 0) return '无法计算';

        // 计算剩余空间和填满时间
        const remainingSpace = capacity - currentStock;
        const hoursToFull = remainingSpace / hourlyProduction;

        // 格式化输出
        if (hoursToFull < 1) {
            return `${Math.round(hoursToFull * 60)}分钟内`;
        } else if (hoursToFull < 24) {
            return `${Math.round(hoursToFull)}小时内`;
        } else {
            return `${Math.round(hoursToFull / 24)}天内`;
        }
    }

    // 收集额外的游戏信息
    function collectAdditionalGameInfo() {
        const gameInfo = {
            冒险等级: '未知',
            金币: '0',
            银币: '0',
            村庄人口: '0'
        };

        try {
            // 尝试获取冒险等级
            const adventureLevel = document.querySelector('.content')?.textContent?.trim();
            if (adventureLevel) gameInfo.冒险等级 = adventureLevel;

            // 尝试获取金币
            const goldAmount = document.querySelector('.ajaxReplaceableGoldAmount')?.textContent?.trim();
            if (goldAmount) gameInfo.金币 = goldAmount;

            // 尝试获取银币
            const silverAmount = document.querySelector('.ajaxReplaceableSilverAmount')?.textContent?.trim();
            if (silverAmount) gameInfo.银币 = silverAmount;

            // 尝试获取村庄人口
            const population = document.querySelector('.population span')?.textContent?.trim();
            if (population) gameInfo.村庄人口 = population;
        } catch (error) {
            console.error('收集额外游戏信息时出错:', error);
        }

        return gameInfo;
    }

    // 更新资源面板
    function updateResourcePanel(resources) {
        // 确保资源面板存在
        const panel = document.getElementById('travian-resource-panel');
        if (!panel) return;

        // 更新额外游戏信息
        const additionalInfo = collectAdditionalGameInfo();
        const safeUpdateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        safeUpdateElement('adventure-level', additionalInfo.冒险等级 || '-');
        safeUpdateElement('gold-amount', additionalInfo.金币 || '0');
        safeUpdateElement('silver-amount', additionalInfo.银币 || '0');
        safeUpdateElement('village-population', additionalInfo.村庄人口 || '0');

        // 更新建筑管理区域
        try {
            // 使用新的ResourceBuildingManager收集建筑信息
            const resourceBuildings = ResourceBuildingManager.collectResourceBuildingInfo();
            createResourceBuildingTypeList(resourceBuildings);
        } catch (error) {
            console.error('更新资源建筑信息时出错:', error);
        }
    }

    // 创建可展开的资源建筑类型列表
    function createResourceBuildingTypeList(resourceBuildings) {
        const container = document.getElementById('building-types-container');
        
        // 调试日志
        console.log('创建资源建筑类型列表', resourceBuildings);
        
        if (!container) {
            console.error('未找到building-types-container');
            return;
        }

        container.innerHTML = ''; // 清空现有内容
        container.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
        `;

        // 遍历资源建筑类型
        for (const [type, buildings] of Object.entries(resourceBuildings)) {
            // 只处理有建筑的类型
            if (buildings.length === 0) continue;

            // 创建每种资源建筑类型的容器
            const typeContainer = document.createElement('div');
            typeContainer.style.cssText = `
                background-color: rgba(255,255,255,0.05);
                border-radius: 3px;
                overflow: hidden;
            `;

            // 标题栏（可点击展开/折叠）
            const typeHeader = document.createElement('div');
            typeHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px;
                cursor: pointer;
                font-size: 12px;
                background-color: rgba(255,255,255,0.1);
            `;
            typeHeader.innerHTML = `
                <span>${type} (${buildings.length})</span>
                <span>▼</span>
            `;

            // 建筑列表（初始隐藏）
            const buildingList = document.createElement('div');
            buildingList.style.cssText = `
                display: none;
                padding: 5px;
                font-size: 12px;
                max-height: 150px;
                overflow-y: auto;
            `;

            // 填充建筑列表
            buildings.forEach(building => {
                const buildingItem = document.createElement('div');
                buildingItem.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3px;
                    padding: 3px;
                    cursor: pointer;
                    border-radius: 2px;
                    transition: background-color 0.2s;
                `;
                buildingItem.innerHTML = `
                    <span>地块ID: ${building.地块ID}</span>
                    <span>等级: ${building.当前等级}</span>
                    <span style="color: ${building.可升级 ? '#4CAF50' : '#888'}">
                        ${building.可升级 ? '可升级' : '不可升级'}
                    </span>
                `;

                // 鼠标悬停效果
                buildingItem.addEventListener('mouseenter', () => {
                    buildingItem.style.backgroundColor = 'rgba(255,255,255,0.1)';
                });
                buildingItem.addEventListener('mouseleave', () => {
                    buildingItem.style.backgroundColor = 'transparent';
                });

                // 点击建筑项目跳转到对应建筑页面
                buildingItem.addEventListener('click', () => {
                    console.log('点击建筑:', building);
                    const buildLink = document.querySelector(`a[href="${building.建设链接}"]`);
                    if (buildLink) {
                        buildLink.click();
                    } else {
                        console.error('未找到建筑链接:', building.建设链接);
                    }
                });

                buildingList.appendChild(buildingItem);
            });

            // 切换展开/折叠
            typeHeader.addEventListener('click', () => {
                // 先收起所有其他列表
                container.querySelectorAll('.building-list').forEach(list => {
                    if (list !== buildingList) {
                        list.style.display = 'none';
                        list.previousElementSibling.querySelector('span:last-child').textContent = '▼';
                    }
                });

                // 切换当前列表
                const isHidden = buildingList.style.display === 'none';
                buildingList.style.display = isHidden ? 'block' : 'none';
                typeHeader.querySelector('span:last-child').textContent = isHidden ? '▲' : '▼';
            });

            // 添加类名以便后续查找
            buildingList.classList.add('building-list');

            typeContainer.appendChild(typeHeader);
            typeContainer.appendChild(buildingList);
            container.appendChild(typeContainer);
        }

        console.log('资源建筑类型列表创建完成');
    }

    // 中央控制器
    const TravianAssistant = {
        // 全局配置
        config: {
            debugMode: true,
            autoUpdateInterval: 5000,
            resourceDataUpdateInterval: 15, // 资源数据更新间隔
            resourceBuildingUpdateInterval: 60, // 资源建筑信息更新间隔（秒）
            enabledModules: {
                resourcePage: true,
                villageBuildings: true,
                mapPage: true,
                statistics: true,
                reports: true,
                messages: true,
                dailyQuests: true
            }
        },

        // 日志记录器
        log: function(message, level = 'info') {
            if (this.config.debugMode) {
                const levels = {
                    'info': console.log,
                    'warn': console.warn,
                    'error': console.error
                };
                (levels[level] || console.log)(`[Travian助手] ${message}`);
            }
        },

        // 页面识别
        getCurrentPage: function() {
            const path = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);

            if (path.includes('dorf1.php')) return 'resourcePage';
            if (path.includes('dorf2.php')) return 'villageBuildings';
            if (path.includes('karte.php')) return 'mapPage';
            if (path.includes('statistics.php')) return 'statistics';
            if (path.includes('berichte.php')) return 'reports';
            if (path.includes('nachrichten.php')) return 'messages';
            if (path.includes('build.php') && searchParams.get('id') && searchParams.get('gid')) return 'buildingDetailPage';

            return 'unknown';
        },

        // 模块管理器
        modules: {
            // 资源页面模块
            resourcePage: {
                resourcePanelInterval: null,

                // 创建资源面板
                createResourcePanel: function() {
                    const panel = document.createElement('div');
                    panel.id = 'travian-resource-panel';
                    panel.style.cssText = `
                        position: fixed;
                        left: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 250px;
                        max-height: 500px;
                        background-color: rgba(0,0,0,0.7);
                        color: white;
                        padding: 10px;
                        z-index: 9999;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.5);
                        overflow-y: auto;
                    `;
                    
                    // 使用之前创建面板的完整HTML
                    panel.innerHTML = createResourcePanelHTML();
                    return panel;
                },

                // 初始化资源面板
                init: function() {
                    TravianAssistant.log('初始化资源页面模块');
                    
                    // 创建并添加面板
                    const panel = this.createResourcePanel();
                    document.body.appendChild(panel);

                    // 定期更新资源信息
                    this.resourcePanelInterval = setInterval(() => {
                        const resources = collectResourceInfo();
                        this.update(resources);
                    }, TravianAssistant.config.autoUpdateInterval);

                    return this.resourcePanelInterval;
                },

                // 更新资源面板
                update: function(resources) {
                    updateResourcePanel(resources);
                },

                // 清理资源面板
                cleanup: function() {
                    const existingPanel = document.getElementById('travian-resource-panel');
                    if (existingPanel) {
                        existingPanel.remove();
                    }
                    if (this.resourcePanelInterval) {
                        clearInterval(this.resourcePanelInterval);
                        this.resourcePanelInterval = null;
                    }
                }
            },

            // 村庄建筑页面模块
            villageBuildings: {
                init: function() {
                    // 添加村庄建筑页面特定功能
                    TravianAssistant.log('初始化村庄建筑页面模块');
                    // 可以添加建筑升级建议、资源分配等功能
                },
                update: function() {
                    // 定期更新村庄建筑信息
                }
            },

            // 地图页面模块
            mapPage: {
                init: function() {
                    TravianAssistant.log('初始化地图页面模块');
                    // 添加地图资源标记、距离计算等功能
                },
                update: function() {
                    // 地图页面定期更新逻辑
                }
            },

            // 统计页面模块
            statistics: {
                init: function() {
                    TravianAssistant.log('初始化统计页面模块');
                    // 添加额外的统计分析功能
                },
                update: function() {
                    // 统计页面更新逻辑
                }
            },

            // 报告页面模块
            reports: {
                init: function() {
                    TravianAssistant.log('初始化报告页面模块');
                    // 添加报告分类、筛选等功能
                },
                update: function() {
                    // 报告页面更新逻辑
                }
            },

            // 消息页面模块
            messages: {
                init: function() {
                    TravianAssistant.log('初始化消息页面模块');
                    // 添加消息管理、快速回复等功能
                },
                update: function() {
                    // 消息页面更新逻辑
                }
            },

            // 每日任务模块
            dailyQuests: {
                init: function() {
                    TravianAssistant.log('初始化每日任务模块');
                    // 添加每日任务追踪、提醒等功能
                    this.addQuickAccessButton();
                },
                addQuickAccessButton: function() {
                    const questButton = document.querySelector('.dailyQuests');
                    if (questButton) {
                        questButton.addEventListener('click', () => {
                            Travian.React.openDailyQuestsDialog();
                        });
                    }
                },
                update: function() {
                    // 每日任务更新逻辑
                }
            },

            // 建筑详情页模块
            buildingDetailPage: {
                init: function() {
                    TravianAssistant.log('初始化建筑详情页模块');
                    
                    // 解析建筑详情
                    const buildingInfo = ResourceBuildingManager.parseBuildingUpgradeDetailPage();
                    
                    if (buildingInfo) {
                        this.createBuildingDetailPanel(buildingInfo);
                    }
                },

                // 创建建筑详情面板
                createBuildingDetailPanel: function(buildingInfo) {
                    // 创建面板容器
                    const panel = document.createElement('div');
                    panel.id = 'travian-building-detail-panel';
                    panel.style.cssText = `
                        position: fixed;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 250px;
                        background-color: rgba(0,0,0,0.7);
                        color: white;
                        padding: 10px;
                        z-index: 9999;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.5);
                    `;

                    // 构建面板内容
                    panel.innerHTML = `
                        <h3 style="text-align: center; margin-bottom: 10px;">
                            ${buildingInfo.建筑类型} (地块ID: ${buildingInfo.地块ID})
                        </h3>
                        <div style="background-color: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px;">
                            <div>
                                <strong>当前等级:</strong> 
                                <span>${buildingInfo.当前等级}</span>
                            </div>
                            <div style="margin-top: 5px;">
                                <strong>升级成本:</strong>
                                ${Object.entries(buildingInfo.升级成本).map(([resource, amount]) => 
                                    `<span style="margin-right: 10px;">${resource}: ${amount}</span>`
                                ).join('')}
                            </div>
                            <div style="margin-top: 5px;">
                                <strong>升级时间:</strong> 
                                <span>${buildingInfo.升级时间}</span>
                            </div>
                            ${buildingInfo.升级条件 ? `
                            <div style="margin-top: 5px; color: #ff4d4d;">
                                <strong>升级条件:</strong>
                                ${buildingInfo.升级条件.map(condition => 
                                    `<div>• ${condition}</div>`
                                ).join('')}
                            </div>
                            ` : ''}
                        </div>
                    `;

                    // 添加关闭按钮
                    const closeButton = document.createElement('button');
                    closeButton.textContent = '关闭';
                    closeButton.style.cssText = `
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                    `;
                    closeButton.addEventListener('click', () => {
                        panel.remove();
                    });
                    panel.appendChild(closeButton);

                    // 添加可拖动功能
                    this.makeDraggable(panel);

                    // 将面板添加到文档
                    document.body.appendChild(panel);
                },

                // 使面板可拖动
                makeDraggable: function(panel) {
                    let isDragging = false;
                    let currentX;
                    let currentY;
                    let initialX;
                    let initialY;
                    let xOffset = 0;
                    let yOffset = 0;

                    const dragStart = (e) => {
                        initialX = e.clientX - xOffset;
                        initialY = e.clientY - yOffset;

                        if (e.target === panel) {
                            isDragging = true;
                        }
                    };

                    const dragEnd = () => {
                        initialX = currentX;
                        initialY = currentY;
                        isDragging = false;
                    };

                    const drag = (e) => {
                        if (isDragging) {
                            e.preventDefault();
                            currentX = e.clientX - initialX;
                            currentY = e.clientY - initialY;

                            xOffset = currentX;
                            yOffset = currentY;

                            setTranslate(currentX, currentY, panel);
                        }
                    };

                    const setTranslate = (xPos, yPos, el) => {
                        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
                    };

                    panel.addEventListener('mousedown', dragStart);
                    document.addEventListener('mouseup', dragEnd);
                    document.addEventListener('mousemove', drag);
                }
            }
        },

        // 主初始化方法
        init: function() {
            // 设置资源数据更新间隔
            ResourceDataManager.setUpdateInterval(this.config.resourceDataUpdateInterval);

            // 设置资源建筑信息更新间隔
            ResourceBuildingManager.setUpdateInterval(this.config.resourceBuildingUpdateInterval);

            this.log('Travian助手初始化开始');
            
            // 检测当前页面
            const currentPage = this.getCurrentPage();
            this.log(`当前页面: ${currentPage}`);

            // 初始化对应模块
            const module = this.modules[currentPage];
            if (module && this.config.enabledModules[currentPage]) {
                module.init();
            }

            // 添加全局快捷键
            this.setupGlobalShortcuts();
        },

        // 全局快捷键设置
        setupGlobalShortcuts: function() {
            document.addEventListener('keydown', (event) => {
                // Ctrl + Shift + R 切换资源面板
                if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                    const existingPanel = document.getElementById('travian-resource-panel');
                    
                    if (existingPanel) {
                        existingPanel.style.display = 
                            existingPanel.style.display === 'none' ? 'block' : 'none';
                    } else if (this.modules.resourcePage) {
                        this.modules.resourcePage.init();
                    }
                }
                
                // Ctrl + Shift + Q 关闭面板
                if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
                    if (this.modules.resourcePage) {
                        this.modules.resourcePage.cleanup();
                    }
                }
            });
        },

        // 添加一个方法允许动态调整更新间隔
        setResourceDataUpdateInterval: function(minutes) {
            this.config.resourceDataUpdateInterval = minutes;
            ResourceDataManager.setUpdateInterval(minutes);
            this.log(`资源数据更新间隔已调整为 ${minutes} 分钟`);
        },

        // 添加方法允许动态调整资源建筑信息更新间隔
        setResourceBuildingUpdateInterval: function(seconds) {
            this.config.resourceBuildingUpdateInterval = seconds;
            ResourceBuildingManager.setUpdateInterval(seconds);
            this.log(`资源建筑信息更新间隔已调整为 ${seconds} 秒`);
        }
    };

    // 创建资源面板HTML
    function createResourcePanelHTML() {
        return `
            <h2 style="margin-bottom: 10px; text-align: center; color: #f0f0f0; font-size: 16px;">游戏助手</h2>
            
            <div id="player-info" class="player-info" style="
                background-color: rgba(255,255,255,0.05);
                padding: 5px;
                margin-bottom: 5px;
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                font-size: 12px;
            ">
                <div>
                    <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 5px;">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    冒险: <span id="adventure-level">-</span>
                </div>
                <div>
                    <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 5px;">
                        <path fill="currentColor" d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.98 1-1.72V9c0-.74-.41-1.37-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z"/>
                    </svg>
                    金币: <span id="gold-amount">-</span>
                </div>
                <div>
                    <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 5px;">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09v.58c0 .73-.6 1.33-1.33 1.33h-.75c-.73 0-1.33-.6-1.33-1.33v-.6c-1.54-.48-2.67-1.89-2.75-3.55h1.91c.11 1.11.94 2 2 2h2.12c1.18 0 2.12-.98 2.12-2.17 0-1.32-.97-1.77-2.75-2.33-2.04-.63-4.04-1.44-4.04-3.67 0-1.63 1.11-3.04 2.67-3.48V5.33c0-.73.6-1.33 1.33-1.33h.75c.73 0 1.33.6 1.33 1.33v.58c1.54.48 2.67 1.89 2.75 3.55h-1.91c-.11-1.11-.94-2-2-2h-2.12c-1.18 0-2.12.98-2.12 2.17 0 1.32.97 1.77 2.75 2.33 2.04.63 4.04 1.44 4.04 3.67 0 1.63-1.11 3.04-2.67 3.48z"/>
                    </svg>
                    银币: <span id="silver-amount">-</span>
                </div>
                <div>
                    <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 5px;">
                        <path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                    </svg>
                    人口: <span id="village-population">-</span>
                </div>
            </div>

            <div id="building-manage-section" style="
                background-color: rgba(255,255,255,0.05);
                padding: 5px;
                margin-top: 5px;
                border-radius: 5px;
            ">
                <h3 style="color: #f0f0f0; margin-bottom: 5px; font-size: 14px;">资源建筑管理</h3>
                <div id="building-types-container"></div>
            </div>
        `;
    }

    // 页面加载完成后初始化
    if (document.readyState === 'complete') {
        TravianAssistant.init();
    } else {
        window.addEventListener('load', () => {
            TravianAssistant.init();
        });
    }

    // 控制台提示
    console.log('Travian资源助手已加载 - 使用 Ctrl+Shift+R 开启/关闭资源面板');
})(); 