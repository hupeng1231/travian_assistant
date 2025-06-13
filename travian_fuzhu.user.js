// ==UserScript==
// @name         Travian游戏助手
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Travian游戏辅助工具，支持多页面功能
// @match        https://*.travian.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
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

        // 存储展开状态
        expandedTypes: new Set(),

        // 切换展开状态
        toggleExpanded: function(type) {
            if (this.expandedTypes.has(type)) {
                this.expandedTypes.delete(type);
            } else {
                this.expandedTypes.add(type);
            }
        },

        // 检查是否展开
        isExpanded: function(type) {
            return this.expandedTypes.has(type);
        },

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

    // 建筑队列管理器
    const BuildingQueueManager = {
        // 存储当前建筑队列
        currentQueue: [],

        // 最大队列长度
        MAX_QUEUE_LENGTH: 5,

        // 队列执行状态
        isExecuting: false,
        executionInterval: null,
        checkInterval: 5000, // 检查间隔（毫秒）

        // 添加建筑到队列
        addToQueue: function(buildingInfo) {
            if (this.currentQueue.length >= this.MAX_QUEUE_LENGTH) {
                TravianAssistant.log('建筑队列已满', 'warn');
                return false;
            }

            // 检查是否已经在队列中
            const isInQueue = this.currentQueue.some(item => 
                item.地块ID === buildingInfo.地块ID && 
                item.建筑类型 === buildingInfo.建筑类型
            );

            if (isInQueue) {
                TravianAssistant.log('该建筑已在队列中', 'warn');
                return false;
            }

            // 添加时间戳和建筑类型ID
            buildingInfo.加入时间 = new Date().getTime();
            buildingInfo.建筑类型ID = Object.entries(RESOURCE_BUILDING_TYPES).find(([_, name]) => name === buildingInfo.建筑类型)?.[0];
            
            // 保存升级所需的资源信息
            if (buildingInfo.升级成本) {
                buildingInfo.所需资源 = buildingInfo.升级成本;
            }
            
            this.currentQueue.push(buildingInfo);
            
            TravianAssistant.log(`建筑 ${buildingInfo.建筑类型} (地块ID: ${buildingInfo.地块ID}) 已加入队列`);
            return true;
        },

        // 从队列中移除建筑
        removeFromQueue: function(buildingId) {
            const index = this.currentQueue.findIndex(item => item.地块ID === buildingId);
            if (index !== -1) {
                const removed = this.currentQueue.splice(index, 1)[0];
                TravianAssistant.log(`建筑 ${removed.建筑类型} (地块ID: ${removed.地块ID}) 已从队列中移除`);
                return true;
            }
            return false;
        },

        // 获取当前队列
        getCurrentQueue: function() {
            return [...this.currentQueue];
        },

        // 清空队列
        clearQueue: function() {
            this.currentQueue = [];
            // 如果正在执行，停止执行
            if (this.isExecuting) {
                this.stopQueueExecution();
            }
            TravianAssistant.log('建筑队列已清空');
            // 更新队列显示
            updateBuildingQueue();
        },

        // 保存队列状态
        saveQueueState: function() {
            // 确保队列中的建筑信息包含所需资源
            const queueWithResources = this.currentQueue.map(building => {
                // 如果建筑信息中没有所需资源，尝试从页面获取
                if (!building.所需资源 && window.location.pathname.includes('build.php')) {
                    building.所需资源 = getBuildingUpgradeRequirements();
                }
                return building;
            });

            const state = {
                queue: queueWithResources,
                isExecuting: this.isExecuting,
                lastBuildingId: this.currentQueue.length > 0 ? this.currentQueue[0].地块ID : null,
                lastBuildingType: this.currentQueue.length > 0 ? this.currentQueue[0].建筑类型ID : null,
                lastPage: window.location.pathname,
                timestamp: new Date().getTime()
            };

            // 打印保存的状态信息，用于调试
            TravianAssistant.log('保存队列状态:', 'info');
            TravianAssistant.log(`队列长度: ${queueWithResources.length}`, 'info');
            if (queueWithResources.length > 0) {
                TravianAssistant.log(`第一个建筑: ${queueWithResources[0].建筑类型} (ID: ${queueWithResources[0].地块ID})`, 'info');
                TravianAssistant.log(`所需资源: ${JSON.stringify(queueWithResources[0].所需资源)}`, 'info');
            }

            GM_setValue('buildingQueueState', JSON.stringify(state));
        },

        // 恢复队列状态
        restoreQueueState: function() {
            try {
                const stateStr = GM_getValue('buildingQueueState');
                if (!stateStr) return false;

                const state = JSON.parse(stateStr);
                const currentTime = new Date().getTime();
                
                // 检查状态是否过期（超过5分钟）
                if (currentTime - state.timestamp > 5 * 60 * 1000) {
                    GM_deleteValue('buildingQueueState');
                    return false;
                }

                // 打印恢复的状态信息，用于调试
                TravianAssistant.log('恢复队列状态:', 'info');
                TravianAssistant.log(`队列长度: ${state.queue.length}`, 'info');
                if (state.queue.length > 0) {
                    TravianAssistant.log(`第一个建筑: ${state.queue[0].建筑类型} (ID: ${state.queue[0].地块ID})`, 'info');
                    TravianAssistant.log(`所需资源: ${JSON.stringify(state.queue[0].所需资源)}`, 'info');
                }

                this.currentQueue = state.queue;
                this.isExecuting = state.isExecuting;

                // 检查当前页面是否匹配最后一个建筑
                const urlParams = new URLSearchParams(window.location.search);
                const currentBuildingId = urlParams.get('id');
                const currentBuildingType = urlParams.get('gid');

                // 如果当前页面匹配最后一个建筑，且队列正在执行，则继续执行
                if (state.isExecuting && 
                    currentBuildingId === state.lastBuildingId && 
                    currentBuildingType === state.lastBuildingType) {
                    TravianAssistant.log('恢复队列执行状态');
                    this.startQueueExecution();
                }

                return true;
            } catch (error) {
                TravianAssistant.log(`恢复队列状态时出错: ${error.message}`, 'error');
                GM_deleteValue('buildingQueueState');
                return false;
            }
        },

        // 修改开始执行队列方法
        startQueueExecution: function() {
            if (this.isExecuting) {
                TravianAssistant.log('队列已在执行中', 'warn');
                return false;
            }

            if (this.currentQueue.length === 0) {
                TravianAssistant.log('队列为空', 'warn');
                return false;
            }

            // 获取队列中的第一个建筑
            const firstBuilding = this.currentQueue[0];
            
            // 设置执行状态
            this.isExecuting = true;
            TravianAssistant.log('开始执行建筑队列');
            this.saveQueueState();

            // 跳转到第一个建筑的升级页面
            const upgradeUrl = `build.php?id=${firstBuilding.地块ID}&gid=${firstBuilding.建筑类型ID}`;
            window.location.href = upgradeUrl;

            return true;
        },

        // 修改停止执行队列方法
        stopQueueExecution: function() {
            if (!this.isExecuting) return;

            this.isExecuting = false;
            if (this.executionInterval) {
                clearInterval(this.executionInterval);
                this.executionInterval = null;
            }
            TravianAssistant.log('停止执行建筑队列');
            // 清空队列状态
            GM_deleteValue('buildingQueueState');
            // 更新队列显示
            updateBuildingQueue();
        },

        // 从存储状态中获取当前建筑信息
        getCurrentBuildingFromState: function() {
            try {
                const stateStr = GM_getValue('buildingQueueState');
                if (!stateStr) return null;

                const state = JSON.parse(stateStr);
                if (!state.queue || state.queue.length === 0) return null;

                // 获取当前页面的建筑信息
                const urlParams = new URLSearchParams(window.location.search);
                const currentBuildingId = urlParams.get('id');
                const currentBuildingType = urlParams.get('gid');

                // 获取队列中的第一个建筑
                const firstBuilding = state.queue[0];

                // 检查当前页面是否完全匹配队列中的第一个建筑
                if (currentBuildingId === firstBuilding.地块ID && 
                    currentBuildingType === firstBuilding.建筑类型ID) {
                    TravianAssistant.log(`当前页面匹配队列中的建筑: ${firstBuilding.建筑类型} (地块ID: ${firstBuilding.地块ID})`);
                    return firstBuilding;
                } else {
                    TravianAssistant.log(`当前页面不匹配队列中的建筑:
                        当前页面: ID=${currentBuildingId}, 类型=${currentBuildingType}
                        队列建筑: ID=${firstBuilding.地块ID}, 类型=${firstBuilding.建筑类型ID}`);
                    return null;
                }
            } catch (error) {
                TravianAssistant.log(`获取当前建筑信息时出错: ${error.message}`, 'error');
                return null;
            }
        },

        // 修改执行建筑升级方法
        executeUpgrade: async function(buildingInfo) {
            try {
                const building = buildingInfo || this.getCurrentBuildingFromState();
                if (!building) {
                    TravianAssistant.log('未找到建筑信息', 'error');
                    this.stopQueueExecution();
                    return false;
                }

                // 检查建筑队列状态
                const queueStatus = checkBuildingQueueStatus();
                TravianAssistant.log(`建筑队列状态: ${queueStatus.message}`);

                // 检查资源是否足够
                const resources = collectResourceInfo();
                // 如果在建筑详情页面，获取最新的资源需求
                if (window.location.pathname.includes('build.php')) {
                    building.所需资源 = getBuildingUpgradeRequirements();
                    // 更新队列中的建筑信息
                    const index = this.currentQueue.findIndex(b => b.地块ID === building.地块ID);
                    if (index !== -1) {
                        this.currentQueue[index].所需资源 = building.所需资源;
                    }
                    this.saveQueueState();
                }

                const requirements = building.所需资源;
                if (!requirements) {
                    TravianAssistant.log('未找到建筑所需资源信息', 'error');
                    this.stopQueueExecution();
                    return false;
                }

                let hasEnoughResources = true;
                let missingResources = [];
                
                for (const [resource, required] of Object.entries(requirements)) {
                    const current = parseInt(resources[resource].库存.replace(/[^\d]/g, ''), 10);
                    if (current < required) {
                        hasEnoughResources = false;
                        missingResources.push(`${resource}(${current}/${required})`);
                        TravianAssistant.log(`${resource}资源不足，需要${required}，当前${current}`, 'warn');
                    }
                }

                if (!hasEnoughResources) {
                    TravianAssistant.log(`资源不足，缺少: ${missingResources.join(', ')}`);
                    // 如果当前在建筑详情页面，才跳转到资源页面
                    if (window.location.pathname.includes('build.php')) {
                        window.location.href = 'dorf1.php';
                    }
                    return false;
                }

                switch (queueStatus.status) {
                    case 'upgrading':
                        TravianAssistant.log('当前建筑正在升级中，等待完成');
                        window.location.href = 'dorf1.php';
                        return false;
                    case 'queue_full':
                        TravianAssistant.log('游戏建筑队列已满，等待上一个建筑升级完成');
                        window.location.href = 'dorf1.php';
                        return false;
                    case 'ready':
                        // 获取升级按钮
                        const upgradeButton = document.querySelector('button.textButtonV1.green.build');
                        if (!upgradeButton) {
                            TravianAssistant.log('未找到升级按钮', 'error');
                            window.location.href = 'dorf1.php';
                            return false;
                        }

                        // 获取升级链接
                        const onclickAttr = upgradeButton.getAttribute('onclick');
                        if (!onclickAttr) {
                            TravianAssistant.log('升级按钮没有onclick属性', 'error');
                            window.location.href = 'dorf1.php';
                            return false;
                        }

                        // 从onclick属性中提取URL
                        const upgradeUrlMatch = onclickAttr.match(/window\.location\.href\s*=\s*'([^']+)'/);
                        if (!upgradeUrlMatch) {
                            TravianAssistant.log('无法从onclick属性中提取升级URL', 'error');
                            window.location.href = 'dorf1.php';
                            return false;
                        }

                        const upgradeUrl = upgradeUrlMatch[1];
                        TravianAssistant.log(`获取到升级URL: ${upgradeUrl}`);

                        // 从队列中移除当前建筑
                        this.removeFromQueue(building.地块ID);
                        
                        // 保存队列状态，确保在跳转前更新状态
                        this.saveQueueState();

                        // 禁用按钮防止重复点击
                        upgradeButton.disabled = true;

                        // 使用提取的URL进行升级
                        window.location.href = upgradeUrl;
                        
                        TravianAssistant.log(`建筑 ${building.建筑类型} (地块ID: ${building.地块ID}) 升级已开始`);
                        return true;
                    default:
                        TravianAssistant.log(`未知的建筑队列状态: ${queueStatus.message}`, 'error');
                        window.location.href = 'dorf1.php';
                        return false;
                }
            } catch (error) {
                TravianAssistant.log(`执行建筑升级时出错: ${error.message}`, 'error');
                this.stopQueueExecution();
                return false;
            }
        },

        // 执行下一个建筑
        async executeNextBuilding() {
            if (!this.isExecuting || this.currentQueue.length === 0) {
                this.stopQueueExecution();
                return;
            }

            const building = this.currentQueue[0];
            const currentPage = TravianAssistant.getCurrentPage();
            
            // 如果不在建筑详情页面，不执行任何操作
            if (currentPage !== 'buildingDetailPage') {
                return;
            }

            // 检查当前页面是否匹配队列中的建筑
            const currentBuilding = this.getCurrentBuildingFromState();
            if (!currentBuilding) {
                TravianAssistant.log('当前页面不匹配队列中的建筑，跳过执行');
                return;
            }

            // 检查建筑队列状态
            const queueStatus = checkBuildingQueueStatus();
            if (queueStatus.status === 'upgrading') {
                TravianAssistant.log('当前建筑正在升级中，等待完成');
                return;
            }

            if (queueStatus.status === 'queue_full') {
                TravianAssistant.log('游戏建筑队列已满，等待上一个建筑升级完成');
                return;
            }

            // 尝试执行升级
            const success = await this.executeUpgrade(building);
            if (!success) {
                // 如果升级失败，且不是因为资源不足或队列已满，则停止队列执行
                if (queueStatus.status !== 'insufficient_resources' && queueStatus.status !== 'queue_full') {
                    this.stopQueueExecution();
                }
            }
        },

        // 获取队列执行状态
        getExecutionStatus: function() {
            return this.isExecuting;
        }
    };

    // 添加从页面JavaScript变量中读取资源信息的方法
    function getResourcesFromPageScript() {
        try {
            // 尝试从页面中获取resources变量
            const scriptContent = Array.from(document.scripts)
                .find(script => script.textContent.includes('var resources ='))
                ?.textContent;

            if (!scriptContent) {
                TravianAssistant.log('未找到资源数据脚本', 'warn');
                return null;
            }

            // 提取resources对象
            const match = scriptContent.match(/var\s+resources\s*=\s*({[\s\S]*?});/);
            if (!match) {
                TravianAssistant.log('无法解析资源数据', 'warn');
                return null;
            }

            // 使用Function构造器安全地解析对象
            const resources = (new Function(`return ${match[1]}`))();
            
            // 转换资源数据格式
            const resourceMap = {
                'l1': '木材',
                'l2': '粘土',
                'l3': '铁',
                'l4': '麦子'
            };

            return {
                production: Object.entries(resources.production).reduce((acc, [key, value]) => {
                    if (resourceMap[key]) {
                        acc[resourceMap[key]] = value;
                    }
                    return acc;
                }, {}),
                storage: Object.entries(resources.storage).reduce((acc, [key, value]) => {
                    if (resourceMap[key]) {
                        acc[resourceMap[key]] = value;
                    }
                    return acc;
                }, {}),
                maxStorage: Object.entries(resources.maxStorage).reduce((acc, [key, value]) => {
                    if (resourceMap[key]) {
                        acc[resourceMap[key]] = value;
                    }
                    return acc;
                }, {})
            };
        } catch (error) {
            TravianAssistant.log(`读取页面资源数据时出错: ${error.message}`, 'error');
            return null;
        }
    }

    // 修改收集资源信息的方法
    function collectResourceInfo() {
        // 首先尝试从页面脚本中获取数据
        const pageResources = getResourcesFromPageScript();
        if (pageResources) {
            const resources = {};
            for (const [resource, storage] of Object.entries(pageResources.storage)) {
                resources[resource] = {
                    库存: storage.toString(),
                    仓库容量: pageResources.maxStorage[resource].toString(),
                    库存百分比: `${(storage / pageResources.maxStorage[resource] * 100).toFixed(1)}%`,
                    每小时产量: pageResources.production[resource]
                };
            }
            return resources;
        }

        // 如果无法从页面脚本获取，则使用原来的DOM解析方法
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
        for (const [resource, production] of Object.entries(productionInfo)) {
            if (resources[resource]) {
                resources[resource].每小时产量 = production;
            }
        }

        return resources;
    }

    // 修改收集资源产量信息的方法
    function collectResourceProductionInfo() {
        // 首先尝试从页面脚本中获取数据
        const pageResources = getResourcesFromPageScript();
        if (pageResources) {
            return pageResources.production;
        }

        // 如果无法从页面脚本获取，则使用原来的DOM解析方法
        const production = {
            木材: 0,
            粘土: 0,
            铁: 0,
            麦子: 0
        };

        // 从DOM中获取产量信息
        const productionElements = document.querySelectorAll('.production');
        productionElements.forEach(element => {
            const value = element.textContent.trim();
            const parent = element.closest('.resourceWrapper');
            if (parent) {
                const iconClass = parent.querySelector('.resourceIcon')?.className;
                if (iconClass) {
                    if (iconClass.includes('r1')) {
                        production.木材 = parseInt(value.replace(/[^\d-]/g, ''), 10);
                    } else if (iconClass.includes('r2')) {
                        production.粘土 = parseInt(value.replace(/[^\d-]/g, ''), 10);
                    } else if (iconClass.includes('r3')) {
                        production.铁 = parseInt(value.replace(/[^\d-]/g, ''), 10);
                    } else if (iconClass.includes('r4')) {
                        production.麦子 = parseInt(value.replace(/[^\d-]/g, ''), 10);
                    }
                }
            }
        });

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
            // 保存当前滚动位置
            const queueList = document.getElementById('building-queue-list');
            const scrollPosition = queueList ? queueList.scrollTop : 0;
            
            createResourceBuildingTypeList(resourceBuildings);
            updateBuildingQueue();
            
            // 恢复滚动位置
            if (queueList) {
                queueList.scrollTop = scrollPosition;
            }
        } catch (error) {
            console.error('更新资源建筑信息时出错:', error);
        }
    }

    // 创建可展开的资源建筑类型列表
    function createResourceBuildingTypeList(resourceBuildings) {
        const container = document.getElementById('building-types-container');
        
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

            // 建筑列表
            const buildingList = document.createElement('div');
            buildingList.style.cssText = `
                padding: 5px;
                font-size: 12px;
                max-height: 150px;
                overflow-y: auto;
            `;

            // 根据保存的状态设置初始显示
            const isExpanded = ResourceBuildingManager.isExpanded(type);
            typeHeader.innerHTML = `
                <span>${type} (${buildings.length})</span>
                <span>${isExpanded ? '▲' : '▼'}</span>
            `;
            buildingList.style.display = isExpanded ? 'block' : 'none';

            // 填充建筑列表
            buildings.forEach(building => {
                const buildingItem = document.createElement('div');
                buildingItem.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3px;
                    padding: 3px;
                    border-radius: 2px;
                    transition: background-color 0.2s;
                `;
                buildingItem.innerHTML = `
                    <span>等级: ${building.当前等级}</span>
                    <button class="add-to-queue" style="
                        background-color: #2196F3;
                        color: white;
                        border: none;
                        padding: 2px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                    ">加入队列</button>
                `;

                // 鼠标悬停效果
                buildingItem.addEventListener('mouseenter', () => {
                    buildingItem.style.backgroundColor = 'rgba(255,255,255,0.1)';
                });
                buildingItem.addEventListener('mouseleave', () => {
                    buildingItem.style.backgroundColor = 'transparent';
                });

                // 点击加入队列按钮
                const addToQueueButton = buildingItem.querySelector('.add-to-queue');
                addToQueueButton.addEventListener('click', () => {
                    // 构建建筑信息
                    const buildingInfo = {
                        建筑类型: type,
                        地块ID: building.地块ID,
                        当前等级: building.当前等级,
                        升级成本: {}, // 这里需要从游戏页面获取，暂时留空
                        升级时间: '', // 这里需要从游戏页面获取，暂时留空
                        建设链接: building.建设链接
                    };

                    // 添加到队列
                    const added = BuildingQueueManager.addToQueue(buildingInfo);
                    if (added) {
                        // 更新按钮状态
                        addToQueueButton.disabled = true;
                        addToQueueButton.textContent = '已在队列';
                        addToQueueButton.style.backgroundColor = '#888';
                    }
                });

                buildingList.appendChild(buildingItem);
            });

            // 切换展开/折叠
            typeHeader.addEventListener('click', () => {
                // 更新展开状态
                ResourceBuildingManager.toggleExpanded(type);
                
                // 先收起所有其他列表
                container.querySelectorAll('.building-list').forEach(list => {
                    if (list !== buildingList) {
                        list.style.display = 'none';
                        const otherType = list.previousElementSibling.querySelector('span:first-child').textContent.split(' ')[0];
                        ResourceBuildingManager.expandedTypes.delete(otherType);
                        list.previousElementSibling.querySelector('span:last-child').textContent = '▼';
                    }
                });

                // 更新当前列表显示
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
    }

    // 更新建筑队列显示
    function updateBuildingQueue() {
        const queueList = document.getElementById('building-queue-list');
        if (!queueList) return;

        const queue = BuildingQueueManager.getCurrentQueue();
        const isExecuting = BuildingQueueManager.getExecutionStatus();
        
        // 更新开始/停止按钮
        const startButton = document.getElementById('start-queue');
        if (startButton) {
            startButton.textContent = isExecuting ? '停止队列' : '开始队列';
            startButton.style.backgroundColor = isExecuting ? '#f44336' : '#4CAF50';
            startButton.disabled = queue.length === 0;
        }
        
        // 更新队列状态显示
        const statusSection = document.getElementById('queue-status');
        const statusText = document.getElementById('queue-status-text');
        if (statusSection && statusText) {
            if (queue.length > 0) {
                statusSection.style.display = 'block';
                statusText.textContent = isExecuting ? '执行中' : '等待中';
                statusText.style.color = isExecuting ? '#4CAF50' : '#FFA726';
            } else {
                statusSection.style.display = 'none';
                // 如果队列为空但状态是执行中，停止执行
                if (isExecuting) {
                    BuildingQueueManager.stopQueueExecution();
                }
            }
        }
        
        if (queue.length === 0) {
            queueList.innerHTML = '<div style="text-align: center; color: #888; padding: 10px;">队列为空</div>';
            return;
        }

        queueList.innerHTML = queue.map((building, index) => `
            <div class="queue-item" style="
                background-color: rgba(255,255,255,0.05);
                margin-bottom: 3px;
                padding: 5px;
                border-radius: 3px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${building.建筑类型}</div>
                    <div style="font-size: 11px; color: #aaa;">
                        地块ID: ${building.地块ID} | 当前等级: ${building.当前等级}
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    ${!isExecuting ? `
                        <button class="execute-upgrade" data-index="${index}" style="
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 11px;
                        ">升级</button>
                    ` : ''}
                    <button class="remove-from-queue" data-index="${index}" style="
                        background-color: #f44336;
                        color: white;
                        border: none;
                        padding: 2px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                    ">移除</button>
                </div>
            </div>
        `).join('');

        // 添加事件监听
        if (!isExecuting) {
            queueList.querySelectorAll('.execute-upgrade').forEach(button => {
                button.addEventListener('click', async () => {
                    const index = parseInt(button.dataset.index);
                    const building = queue[index];
                    const success = await BuildingQueueManager.executeUpgrade(building);
                    if (success) {
                        BuildingQueueManager.removeFromQueue(building.地块ID);
                        updateBuildingQueue();
                    }
                });
            });
        }

        queueList.querySelectorAll('.remove-from-queue').forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.dataset.index);
                const building = queue[index];
                BuildingQueueManager.removeFromQueue(building.地块ID);
                updateBuildingQueue();
            });
        });
    }

    // 添加获取建筑升级所需资源的方法
    function getBuildingUpgradeRequirements() {
        const requirements = {
            木材: 0,
            粘土: 0,
            铁: 0,
            麦子: 0
        };

        // 获取资源需求元素
        const resourceElements = document.querySelectorAll('.resourceWrapper .resource');
        resourceElements.forEach(element => {
            const iconClass = element.querySelector('i')?.className;
            const value = element.querySelector('.value')?.textContent?.trim();
            
            if (!iconClass || !value) return;

            // 根据图标类名判断资源类型
            if (iconClass.includes('r1Big')) {
                requirements.木材 = parseInt(value.replace(/[^\d]/g, ''), 10);
            } else if (iconClass.includes('r2Big')) {
                requirements.粘土 = parseInt(value.replace(/[^\d]/g, ''), 10);
            } else if (iconClass.includes('r3Big')) {
                requirements.铁 = parseInt(value.replace(/[^\d]/g, ''), 10);
            } else if (iconClass.includes('r4Big')) {
                requirements.麦子 = parseInt(value.replace(/[^\d]/g, ''), 10);
            }
        });

        return requirements;
    }

    // 添加检查建筑队列状态的方法
    function checkBuildingQueueStatus() {
        // 检查是否有正在进行的升级
        const upgradeInProgress = document.querySelector('.upgradeProgress');
        if (upgradeInProgress) {
            return {
                status: 'upgrading',
                message: '当前建筑正在升级中'
            };
        }

        // 检查是否有升级按钮
        const upgradeButton = document.querySelector('button.textButtonV1.green.build');
        if (upgradeButton) {
            return {
                status: 'ready',
                message: '可以升级'
            };
        }

        // 检查是否有资源不足的提示
        const resourceErrors = document.querySelectorAll('.resourceWrapper .resource.notEnough');
        if (resourceErrors.length > 0) {
            return {
                status: 'insufficient_resources',
                message: '资源不足'
            };
        }

        // 检查是否有建筑队列已满的提示
        const queueFullMessage = document.querySelector('.errorMessage');
        if (queueFullMessage && queueFullMessage.textContent.includes('建筑队列已满')) {
            return {
                status: 'queue_full',
                message: '建筑队列已满'
            };
        }

        return {
            status: 'unknown',
            message: '未知状态'
        };
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
            // 通用面板模块
            commonPanel: {
                panel: null,
                panelInterval: null,

                // 创建通用面板
                createPanel: function() {
                    const panel = document.createElement('div');
                    panel.id = 'travian-assistant-panel';
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
                    
                    panel.innerHTML = this.createPanelHTML();
                    return panel;
                },

                // 创建面板HTML
                createPanelHTML: function() {
                    const currentPage = TravianAssistant.getCurrentPage();
                    let pageSpecificContent = '';

                    // 根据当前页面添加特定内容
                    switch (currentPage) {
                        case 'resourcePage':
                            pageSpecificContent = `
                                <div id="building-queue-section" style="
                                    background-color: rgba(255,255,255,0.05);
                                    padding: 5px;
                                    margin-top: 5px;
                                    border-radius: 5px;
                                ">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                        <h3 style="color: #f0f0f0; margin: 0; font-size: 14px;">建筑队列</h3>
                                        <div style="display: flex; gap: 5px;">
                                            <button id="start-queue" style="
                                                background-color: #4CAF50;
                                                color: white;
                                                border: none;
                                                padding: 2px 8px;
                                                border-radius: 3px;
                                                cursor: pointer;
                                                font-size: 12px;
                                            ">开始队列</button>
                                            <button id="stop-queue" style="
                                                background-color: #ff9800;
                                                color: white;
                                                border: none;
                                                padding: 2px 8px;
                                                border-radius: 3px;
                                                cursor: pointer;
                                                font-size: 12px;
                                                display: none;
                                            ">停止队列</button>
                                            <button id="clear-queue" style="
                                                background-color: #f44336;
                                                color: white;
                                                border: none;
                                                padding: 2px 8px;
                                                border-radius: 3px;
                                                cursor: pointer;
                                                font-size: 12px;
                                            ">清空队列</button>
                                        </div>
                                    </div>
                                    <div id="building-queue-list" style="
                                        max-height: 200px;
                                        overflow-y: auto;
                                        font-size: 12px;
                                    "></div>
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
                            break;
                        case 'buildingDetailPage':
                            pageSpecificContent = `
                                <div id="building-queue-section" style="
                                    background-color: rgba(255,255,255,0.05);
                                    padding: 5px;
                                    margin-top: 5px;
                                    border-radius: 5px;
                                ">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                        <h3 style="color: #f0f0f0; margin: 0; font-size: 14px;">建筑队列</h3>
                                        <div style="display: flex; gap: 5px;">
                                            <button id="start-queue" style="
                                                background-color: #4CAF50;
                                                color: white;
                                                border: none;
                                                padding: 2px 8px;
                                                border-radius: 3px;
                                                cursor: pointer;
                                                font-size: 12px;
                                            ">开始队列</button>
                                            <button id="stop-queue" style="
                                                background-color: #ff9800;
                                                color: white;
                                                border: none;
                                                padding: 2px 8px;
                                                border-radius: 3px;
                                                cursor: pointer;
                                                font-size: 12px;
                                                display: none;
                                            ">停止队列</button>
                                            <button id="clear-queue" style="
                                                background-color: #f44336;
                                                color: white;
                                                border: none;
                                                padding: 2px 8px;
                                                border-radius: 3px;
                                                cursor: pointer;
                                                font-size: 12px;
                                            ">清空队列</button>
                                        </div>
                                    </div>
                                    <div id="building-queue-list" style="
                                        max-height: 200px;
                                        overflow-y: auto;
                                        font-size: 12px;
                                    "></div>
                                </div>

                                <div id="building-detail-section" style="
                                    background-color: rgba(255,255,255,0.05);
                                    padding: 5px;
                                    margin-top: 5px;
                                    border-radius: 5px;
                                ">
                                    <h3 style="color: #f0f0f0; margin-bottom: 5px; font-size: 14px;">建筑详情</h3>
                                    <div id="building-detail-content"></div>
                                </div>
                            `;
                            break;
                        case 'villageBuildings':
                            pageSpecificContent = `
                                <div id="village-buildings-section" style="
                                    background-color: rgba(255,255,255,0.05);
                                    padding: 5px;
                                    margin-top: 5px;
                                    border-radius: 5px;
                                ">
                                    <h3 style="color: #f0f0f0; margin-bottom: 5px; font-size: 14px;">村庄建筑</h3>
                                    <div id="village-buildings-content"></div>
                                </div>
                            `;
                            break;
                        // 可以添加更多页面的特定内容
                    }

                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h2 style="margin: 0; color: #f0f0f0; font-size: 16px;">游戏助手</h2>
                            <button id="toggle-panel" style="
                                background: none;
                                border: none;
                                color: white;
                                cursor: pointer;
                                padding: 2px 5px;
                                font-size: 16px;
                            ">−</button>
                        </div>
                        
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

                        ${pageSpecificContent}

                        <div id="queue-status" style="
                            background-color: rgba(255,255,255,0.05);
                            padding: 5px;
                            margin-top: 5px;
                            border-radius: 5px;
                            font-size: 12px;
                            display: none;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>队列状态:</span>
                                <span id="queue-status-text">未执行</span>
                            </div>
                        </div>
                    `;
                },

                // 初始化面板
                init: function() {
                    TravianAssistant.log('初始化通用面板');
                    
                    // 创建并添加面板
                    this.panel = this.createPanel();
                    document.body.appendChild(this.panel);

                    // 添加面板切换按钮事件
                    const toggleButton = this.panel.querySelector('#toggle-panel');
                    if (toggleButton) {
                        toggleButton.addEventListener('click', () => {
                            const content = this.panel.querySelector('#player-info').parentElement;
                            const isHidden = content.style.display === 'none';
                            content.style.display = isHidden ? 'block' : 'none';
                            toggleButton.textContent = isHidden ? '−' : '+';
                        });
                    }

                    // 添加队列控制按钮事件
                    const startButton = this.panel.querySelector('#start-queue');
                    if (startButton) {
                        startButton.addEventListener('click', () => {
                            const isExecuting = BuildingQueueManager.getExecutionStatus();
                            if (isExecuting) {
                                BuildingQueueManager.stopQueueExecution();
                            } else {
                                BuildingQueueManager.startQueueExecution();
                            }
                            this.updateQueueStatus();
                        });
                    }

                    // 添加清空队列按钮事件
                    const clearButton = this.panel.querySelector('#clear-queue');
                    if (clearButton) {
                        clearButton.addEventListener('click', () => {
                            BuildingQueueManager.clearQueue();
                            this.updateQueueStatus();
                        });
                    }

                    // 定期更新面板信息
                    this.panelInterval = setInterval(() => {
                        this.update();
                    }, TravianAssistant.config.autoUpdateInterval);

                    // 尝试恢复队列状态
                    BuildingQueueManager.restoreQueueState();
                    this.updateQueueStatus();

                    return this.panelInterval;
                },

                // 更新面板
                update: function() {
                    // 更新玩家信息
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

                    // 根据当前页面更新特定内容
                    const currentPage = TravianAssistant.getCurrentPage();
                    switch (currentPage) {
                        case 'resourcePage':
                            // 更新资源建筑信息
                            const resourceBuildings = ResourceBuildingManager.collectResourceBuildingInfo();
                            createResourceBuildingTypeList(resourceBuildings);
                            updateBuildingQueue();
                            break;
                        case 'buildingDetailPage':
                            // 更新建筑详情
                            const buildingInfo = BuildingQueueManager.getCurrentBuildingFromState();
                            if (buildingInfo) {
                                const detailContent = document.getElementById('building-detail-content');
                                if (detailContent) {
                                    // 获取当前资源和产量信息
                                    const resources = collectResourceInfo();
                                    const productionRates = collectResourceProductionInfo();
                                    const requirements = getBuildingUpgradeRequirements();
                                    
                                    // 计算资源积累时间
                                    const accumulationInfo = calculateResourceAccumulationTime(resources, requirements, productionRates);
                                    
                                    // 构建资源对比HTML
                                    const resourceComparisonHTML = Object.entries(requirements).map(([resource, required]) => {
                                        const current = parseInt(resources[resource].库存.replace(/[^\d]/g, ''), 10);
                                        const production = productionRates[resource] || 0;
                                        const isEnough = current >= required;
                                        const resourceInfo = accumulationInfo.资源详情[resource];
                                        
                                        return `
                                            <div style="
                                                display: flex;
                                                justify-content: space-between;
                                                align-items: center;
                                                padding: 2px 0;
                                                ${!isEnough ? 'color: #ff6b6b;' : ''}
                                            ">
                                                <span>${resource}:</span>
                                                <div style="display: flex; gap: 10px;">
                                                    <span>${current}/${required}</span>
                                                    ${!isEnough ? `
                                                        <span style="color: #ffd700;">
                                                            (+${production}/小时)
                                                        </span>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('');

                                    // 构建预计升级时间HTML
                                    const upgradeTimeHTML = accumulationInfo.最大等待时间 > 0 ? `
                                        <div style="
                                            margin-top: 10px;
                                            padding: 5px;
                                            background-color: rgba(255,255,255,0.1);
                                            border-radius: 3px;
                                        ">
                                            <div style="color: #ffd700; margin-bottom: 5px;">预计升级时间:</div>
                                            <div>${formatTimeDisplay(accumulationInfo.最大等待时间)}</div>
                                            ${Object.entries(accumulationInfo.资源详情).map(([resource, info]) => `
                                                <div style="font-size: 11px; margin-top: 2px;">
                                                    ${resource}: 还需${formatTimeDisplay(info.预计时间)}
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : '';

                                    // 更新面板内容
                                    detailContent.innerHTML = `
                                        <div style="
                                            background-color: rgba(255,255,255,0.05);
                                            padding: 5px;
                                            border-radius: 3px;
                                            margin-bottom: 5px;
                                        ">
                                            <div style="color: #f0f0f0; margin-bottom: 5px;">建筑信息</div>
                                            <div>建筑类型: ${buildingInfo.建筑类型}</div>
                                            <div>地块ID: ${buildingInfo.地块ID}</div>
                                            <div>当前等级: ${buildingInfo.当前等级}</div>
                                        </div>
                                        <div style="
                                            background-color: rgba(255,255,255,0.05);
                                            padding: 5px;
                                            border-radius: 3px;
                                        ">
                                            <div style="color: #f0f0f0; margin-bottom: 5px;">资源需求</div>
                                            ${resourceComparisonHTML}
                                            ${upgradeTimeHTML}
                                        </div>
                                    `;
                                }
                            }
                            break;
                        // 可以添加更多页面的更新逻辑
                    }

                    // 更新队列状态
                    this.updateQueueStatus();
                },

                // 更新队列状态显示
                updateQueueStatus: function() {
                    const statusSection = document.getElementById('queue-status');
                    const statusText = document.getElementById('queue-status-text');
                    if (!statusSection || !statusText) return;

                    const queue = BuildingQueueManager.getCurrentQueue();
                    const isExecuting = BuildingQueueManager.getExecutionStatus();

                    if (queue.length > 0) {
                        statusSection.style.display = 'block';
                        statusText.textContent = isExecuting ? '执行中' : '等待中';
                        statusText.style.color = isExecuting ? '#4CAF50' : '#FFA726';
                    } else {
                        statusSection.style.display = 'none';
                    }
                },

                // 清理面板
                cleanup: function() {
                    if (this.panel) {
                        this.panel.remove();
                        this.panel = null;
                    }
                    if (this.panelInterval) {
                        clearInterval(this.panelInterval);
                        this.panelInterval = null;
                    }
                }
            },

            // 修改资源页面模块
            resourcePage: {
                init: function() {
                    TravianAssistant.log('初始化资源页面模块');
                    
                    // 设置资源数据更新间隔
                    ResourceDataManager.setUpdateInterval(TravianAssistant.config.resourceDataUpdateInterval);
                    
                    // 设置资源建筑信息更新间隔
                    ResourceBuildingManager.setUpdateInterval(TravianAssistant.config.resourceBuildingUpdateInterval);
                    
                    // 初始化资源建筑信息
                    const resourceBuildings = ResourceBuildingManager.collectResourceBuildingInfo();
                    createResourceBuildingTypeList(resourceBuildings);
                    
                    // 初始化建筑队列显示
                    updateBuildingQueue();

                    // 重置资源检查等待状态
                    ResourceCheckManager.stopWaiting();

                    // 检查队列执行状态
                    this.checkQueueExecution();

                    // 设置定期检查
                    setInterval(() => {
                        this.checkQueueExecution();
                    }, 5000); // 每5秒检查一次
                },

                // 添加检查队列执行状态的方法
                checkQueueExecution: function() {
                    const isExecuting = BuildingQueueManager.getExecutionStatus();
                    if (!isExecuting) {
                        ResourceCheckManager.stopWaiting();
                        return;
                    }

                    const queue = BuildingQueueManager.getCurrentQueue();
                    if (queue.length === 0) {
                        BuildingQueueManager.stopQueueExecution();
                        ResourceCheckManager.stopWaiting();
                        return;
                    }

                    // 获取队列中的第一个建筑
                    const nextBuilding = queue[0];
                    
                    // 检查是否有保存的所需资源信息
                    if (!nextBuilding.所需资源) {
                        TravianAssistant.log('未找到建筑所需资源信息，需要获取', 'warn');
                        // 跳转到建筑详情页面获取资源信息
                        const upgradeUrl = `build.php?id=${nextBuilding.地块ID}&gid=${nextBuilding.建筑类型ID}`;
                        window.location.href = upgradeUrl;
                        return;
                    }

                    // 检查游戏建筑队列状态
                    const gameQueueStatus = checkGameBuildingQueue();
                    if (gameQueueStatus.status === 'full') {
                        TravianAssistant.log('游戏建筑队列已满，等待队列空闲');
                        return;
                    }

                    // 检查资源是否足够
                    const resources = collectResourceInfo();
                    const requirements = nextBuilding.所需资源;
                    let hasEnoughResources = true;
                    let missingResources = [];
                    
                    TravianAssistant.log(`检查资源是否足够: ${JSON.stringify(requirements)}`, 'info');
                    
                    for (const [resource, required] of Object.entries(requirements)) {
                        const current = parseInt(resources[resource].库存.replace(/[^\d]/g, ''), 10);
                        TravianAssistant.log(`${resource}: 当前${current}, 需要${required}`, 'info');
                        if (current < required) {
                            hasEnoughResources = false;
                            missingResources.push(`${resource}(${current}/${required})`);
                        }
                    }

                    if (!hasEnoughResources) {
                        if (!ResourceCheckManager.isWaiting()) {
                            ResourceCheckManager.startWaiting();
                        }
                        TravianAssistant.log(`资源不足，等待资源积累: ${missingResources.join(', ')}`);
                        return;
                    }

                    // 资源足够，停止等待状态
                    if (ResourceCheckManager.isWaiting()) {
                        ResourceCheckManager.stopWaiting();
                    }

                    // 跳转到升级页面
                    TravianAssistant.log(`资源充足，准备升级建筑: ${nextBuilding.建筑类型} (地块ID: ${nextBuilding.地块ID})`);
                    const upgradeUrl = `build.php?id=${nextBuilding.地块ID}&gid=${nextBuilding.建筑类型ID}`;
                    window.location.href = upgradeUrl;
                },

                update: function() {
                    // 更新资源建筑信息
                    const resourceBuildings = ResourceBuildingManager.collectResourceBuildingInfo();
                    createResourceBuildingTypeList(resourceBuildings);
                    
                    // 更新建筑队列显示
                    updateBuildingQueue();

                    // 检查队列执行状态
                    this.checkQueueExecution();
                },

                cleanup: function() {
                    // 清理资源页面特定的资源
                    ResourceDataManager.cleanup();
                    ResourceBuildingManager.cleanup();
                    ResourceCheckManager.stopWaiting();
                }
            },

            // 建筑详情页面模块
            buildingDetailPage: {
                resourceCheckInterval: null,

                init: function() {
                    TravianAssistant.log('初始化建筑详情页面模块');
                    
                    // 初始化面板
                    this.updatePanel();

                    // 添加队列控制按钮事件监听
                    const startButton = document.getElementById('start-queue');
                    const stopButton = document.getElementById('stop-queue');
                    const clearButton = document.getElementById('clear-queue');

                    if (startButton) {
                        startButton.addEventListener('click', () => {
                            BuildingQueueManager.startQueueExecution();
                            this.updateQueueStatus();
                            this.checkAndExecuteUpgrade();
                        });
                    }

                    if (stopButton) {
                        stopButton.addEventListener('click', () => {
                            BuildingQueueManager.stopQueueExecution();
                            this.updateQueueStatus();
                            TravianAssistant.log('已停止建筑队列执行');
                        });
                    }

                    if (clearButton) {
                        clearButton.addEventListener('click', () => {
                            if (confirm('确定要清空建筑队列吗？')) {
                                BuildingQueueManager.clearQueue();
                                this.updateQueueStatus();
                                TravianAssistant.log('已清空建筑队列');
                            }
                        });
                    }

                    // 更新队列状态
                    this.updateQueueStatus();

                    // 检查是否需要自动升级
                    this.checkAndExecuteUpgrade();
                },

                // 检查并执行升级
                checkAndExecuteUpgrade: function() {
                    // 检查是否有队列状态且正在执行
                    const isExecuting = BuildingQueueManager.getExecutionStatus();
                    if (!isExecuting) {
                        TravianAssistant.log('队列未在执行状态，跳过自动升级');
                        return;
                    }

                    // 获取当前建筑信息
                    const buildingInfo = BuildingQueueManager.getCurrentBuildingFromState();
                    if (!buildingInfo) {
                        TravianAssistant.log('当前页面不匹配队列中的建筑，跳过自动升级');
                        window.location.href = 'dorf1.php';
                        return;
                    }

                    // 检查资源是否足够
                    const resources = collectResourceInfo();
                    const requirements = getBuildingUpgradeRequirements();
                    let hasEnoughResources = true;
                    let missingResources = [];
                    
                    for (const [resource, required] of Object.entries(requirements)) {
                        const current = parseInt(resources[resource].库存, 10);
                        if (current < required) {
                            hasEnoughResources = false;
                            missingResources.push(`${resource}(${current}/${required})`);
                            TravianAssistant.log(`${resource}资源不足，需要${required}，当前${current}`, 'warn');
                        }
                    }

                    if (!hasEnoughResources) {
                        TravianAssistant.log(`资源不足，等待资源积累: ${missingResources.join(', ')}`);
                        // 开始等待资源积累
                        ResourceCheckManager.startWaiting();

                        // 计算资源积累时间
                        const productionRates = Object.fromEntries(
                            Object.entries(resources).map(([k, v]) => [k, v.每小时产量 || 0])
                        );
                        const accumulationInfo = calculateResourceAccumulationTime(
                            resources, 
                            requirements, 
                            productionRates
                        );

                        // 根据等待时间设置刷新间隔
                        const waitTimeInHours = accumulationInfo.最大等待时间;
                        let refreshInterval;

                        if (waitTimeInHours <= 0.1) { // 小于6分钟
                            refreshInterval = 30 * 1000; // 30秒
                        } else if (waitTimeInHours <= 0.5) { // 小于30分钟
                            refreshInterval = 60 * 1000; // 1分钟
                        } else if (waitTimeInHours <= 2) { // 小于2小时
                            refreshInterval = 5 * 60 * 1000; // 5分钟
                        } else if (waitTimeInHours <= 5) { // 小于5小时
                            refreshInterval = 15 * 60 * 1000; // 15分钟
                        } else {
                            refreshInterval = 30 * 60 * 1000; // 30分钟
                        }

                        TravianAssistant.log(`设置刷新间隔: ${refreshInterval / 1000}秒`);

                        // 设置定时刷新
                        if (this.resourceCheckInterval) {
                            clearInterval(this.resourceCheckInterval);
                        }

                        this.resourceCheckInterval = setInterval(() => {
                            if (ResourceCheckManager.shouldCheckAgain()) {
                                // 重新检查资源
                                const currentResources = collectResourceInfo();
                                let stillWaiting = false;
                                for (const [resource, required] of Object.entries(requirements)) {
                                    const current = parseInt(currentResources[resource].库存, 10);
                                    if (current < required) {
                                        stillWaiting = true;
                                        break;
                                    }
                                }

                                if (!stillWaiting) {
                                    // 资源已足够，停止等待并刷新页面
                                    ResourceCheckManager.stopWaiting();
                                    clearInterval(this.resourceCheckInterval);
                                    this.resourceCheckInterval = null;
                                    TravianAssistant.log('资源已足够，准备升级');
                                    window.location.reload();
                                } else if (ResourceCheckManager.isWaitTimeExceeded()) {
                                    // 等待时间超过最大限制，停止等待
                                    ResourceCheckManager.stopWaiting();
                                    clearInterval(this.resourceCheckInterval);
                                    this.resourceCheckInterval = null;
                                    TravianAssistant.log('等待资源积累超时，返回村庄概览页面');
                                    window.location.href = 'dorf1.php';
                                } else {
                                    // 更新面板显示
                                    this.updatePanel();
                                }
                            }
                        }, refreshInterval);

                        // 立即更新一次面板
                        this.updatePanel();
                        return;
                    }

                    // 检查当前页面是否正在升级中
                    const upgradeInProgress = document.querySelector('.upgradeProgress');
                    if (upgradeInProgress) {
                        TravianAssistant.log('当前建筑正在升级中，跳过自动升级');
                        window.location.href = 'dorf1.php';
                        return;
                    }

                    // 检查是否有升级按钮
                    const upgradeButton = document.querySelector('button.textButtonV1.green.build');
                    if (!upgradeButton) {
                        TravianAssistant.log('未找到升级按钮，跳过自动升级');
                        window.location.href = 'dorf1.php';
                        return;
                    }

                    TravianAssistant.log('检测到队列执行状态，准备执行升级');
                    // 使用 setTimeout 确保页面完全加载后再执行升级
                    setTimeout(() => {
                        BuildingQueueManager.executeNextBuilding();
                    }, 1000);
                },

                updateQueueStatus: function() {
                    const startButton = document.getElementById('start-queue');
                    const stopButton = document.getElementById('stop-queue');
                    const clearButton = document.getElementById('clear-queue');
                    const queueList = document.getElementById('building-queue-list');
                    
                    if (!startButton || !stopButton || !clearButton || !queueList) return;

                    const isExecuting = BuildingQueueManager.getExecutionStatus();
                    const queue = BuildingQueueManager.getCurrentQueue();

                    // 更新按钮状态
                    startButton.style.display = isExecuting ? 'none' : 'inline-block';
                    stopButton.style.display = isExecuting ? 'inline-block' : 'none';
                    clearButton.disabled = isExecuting;

                    // 更新队列列表
                    if (queue.length === 0) {
                        queueList.innerHTML = '<div style="padding: 5px; color: #aaa;">队列为空</div>';
                        return;
                    }

                    queueList.innerHTML = queue.map((building, index) => `
                        <div style="
                            padding: 5px;
                            border-bottom: 1px solid rgba(255,255,255,0.1);
                            ${index === 0 && isExecuting ? 'background-color: rgba(76,175,80,0.1);' : ''}
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <span style="color: ${index === 0 && isExecuting ? '#4CAF50' : '#f0f0f0'}">
                                        ${index + 1}. ${building.建筑类型} (等级 ${building.当前等级})
                                    </span>
                                    ${index === 0 && isExecuting ? 
                                        '<span style="color: #4CAF50; margin-left: 5px;">(执行中)</span>' : ''}
                                </div>
                                <button class="remove-from-queue" data-index="${index}" style="
                                    background-color: #f44336;
                                    color: white;
                                    border: none;
                                    padding: 1px 5px;
                                    border-radius: 2px;
                                    cursor: pointer;
                                    font-size: 11px;
                                    ${isExecuting && index === 0 ? 'display: none;' : ''}
                                ">移除</button>
                            </div>
                            ${building.所需资源 ? `
                                <div style="font-size: 11px; color: #aaa; margin-top: 2px;">
                                    所需资源: ${Object.entries(building.所需资源)
                                        .map(([resource, amount]) => `${resource}: ${amount}`)
                                        .join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('');

                    // 添加移除按钮事件监听
                    queueList.querySelectorAll('.remove-from-queue').forEach(button => {
                        button.addEventListener('click', () => {
                            const index = parseInt(button.getAttribute('data-index'));
                            BuildingQueueManager.removeFromQueueByIndex(index);
                            this.updateQueueStatus();
                        });
                    });
                },

                updatePanel: function() {
                    const detailContent = document.getElementById('building-detail-content');
                    if (!detailContent) return;

                    const buildingInfo = BuildingQueueManager.getCurrentBuildingFromState();
                    if (!buildingInfo) return;

                    // 获取当前资源和产量信息
                    const resources = collectResourceInfo();
                    const requirements = getBuildingUpgradeRequirements();
                    
                    // 构建资源对比HTML
                    const resourceComparisonHTML = Object.entries(requirements).map(([resource, required]) => {
                        const current = parseInt(resources[resource].库存, 10);
                        const production = resources[resource].每小时产量 || 0;
                        const maxStorage = parseInt(resources[resource].仓库容量, 10);
                        const isEnough = current >= required;
                        const storagePercentage = (current / maxStorage * 100).toFixed(1);
                        
                        return `
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 2px 0;
                                ${!isEnough ? 'color: #ff6b6b;' : ''}
                            ">
                                <span>${resource}:</span>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <span>${current}/${required}</span>
                                    <span style="font-size: 11px; color: #aaa;">
                                        (${storagePercentage}%)
                                    </span>
                                    ${!isEnough ? `
                                        <span style="color: #ffd700;">
                                            (+${production}/小时)
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');

                    // 计算资源积累时间
                    const productionRates = Object.fromEntries(
                        Object.entries(resources).map(([k, v]) => [k, v.每小时产量 || 0])
                    );
                    const accumulationInfo = calculateResourceAccumulationTime(
                        resources, 
                        requirements, 
                        productionRates
                    );

                    // 构建预计升级时间HTML
                    const upgradeTimeHTML = accumulationInfo.最大等待时间 > 0 ? `
                        <div style="
                            margin-top: 10px;
                            padding: 5px;
                            background-color: rgba(255,255,255,0.1);
                            border-radius: 3px;
                        ">
                            <div style="color: #ffd700; margin-bottom: 5px;">预计升级时间:</div>
                            <div>${formatTimeDisplay(accumulationInfo.最大等待时间)}</div>
                            ${Object.entries(accumulationInfo.资源详情).map(([resource, info]) => `
                                <div style="font-size: 11px; margin-top: 2px;">
                                    ${resource}: 还需${formatTimeDisplay(info.预计时间)}
                                    (${info.缺少} / ${info.每小时产量}/小时)
                                </div>
                            `).join('')}
                        </div>
                    ` : '';

                    // 更新面板内容
                    detailContent.innerHTML = `
                        <div style="
                            background-color: rgba(255,255,255,0.05);
                            padding: 5px;
                            border-radius: 3px;
                            margin-bottom: 5px;
                        ">
                            <div style="color: #f0f0f0; margin-bottom: 5px;">建筑信息</div>
                            <div>建筑类型: ${buildingInfo.建筑类型}</div>
                            <div>地块ID: ${buildingInfo.地块ID}</div>
                            <div>当前等级: ${buildingInfo.当前等级}</div>
                        </div>
                        <div style="
                            background-color: rgba(255,255,255,0.05);
                            padding: 5px;
                            border-radius: 3px;
                        ">
                            <div style="color: #f0f0f0; margin-bottom: 5px;">资源需求</div>
                            ${resourceComparisonHTML}
                            ${upgradeTimeHTML}
                        </div>
                    `;
                },

                update: function() {
                    // 建筑详情页面不需要定期更新
                },

                cleanup: function() {
                    // 清理资源检查定时器
                    if (this.resourceCheckInterval) {
                        clearInterval(this.resourceCheckInterval);
                        this.resourceCheckInterval = null;
                    }
                    ResourceCheckManager.stopWaiting();
                }
            },

            // ... rest of existing modules ...
        },

        // 主初始化方法
        init: function() {
            TravianAssistant.log('Travian资源助手已加载');
            
            // 初始化通用面板
            TravianAssistant.modules.commonPanel.init();

            // 根据当前页面初始化特定模块
            const currentPage = TravianAssistant.getCurrentPage();
            switch (currentPage) {
                case 'resourcePage':
                    TravianAssistant.log('初始化资源页面模块');
                    TravianAssistant.modules.resourcePage.init();
                    break;
                case 'buildingDetailPage':
                    TravianAssistant.log('初始化建筑详情页面模块');
                    TravianAssistant.modules.buildingDetailPage.init();
                    break;
                // ... other cases ...
            }

            // 尝试恢复队列状态
            BuildingQueueManager.restoreQueueState();
        },

        // 全局快捷键设置
        setupGlobalShortcuts: function() {
            document.addEventListener('keydown', (event) => {
                // Ctrl + Shift + R 切换面板
                if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                    const panel = document.getElementById('travian-assistant-panel');
                    if (panel) {
                        const content = panel.querySelector('#player-info').parentElement;
                        const isHidden = content.style.display === 'none';
                        content.style.display = isHidden ? 'block' : 'none';
                        panel.querySelector('#toggle-panel').textContent = isHidden ? '−' : '+';
                    }
                }
                
                // Ctrl + Shift + Q 关闭面板
                if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
                    if (this.modules.commonPanel) {
                        this.modules.commonPanel.cleanup();
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
        },

        // 清理助手资源
        cleanup: function() {
            TravianAssistant.log('清理助手资源');
            
            // 清理通用面板
            TravianAssistant.modules.commonPanel.cleanup();

            // 根据当前页面清理特定模块
            const currentPage = TravianAssistant.getCurrentPage();
            switch (currentPage) {
                case 'resourcePage':
                    TravianAssistant.modules.resourcePage.cleanup();
                    break;
                case 'buildingDetailPage':
                    // 清理建筑详情页面特定的资源
                    break;
                // ... other cases ...
            }
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

            <div id="building-queue-section" style="
                background-color: rgba(255,255,255,0.05);
                padding: 5px;
                margin-top: 5px;
                border-radius: 5px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <h3 style="color: #f0f0f0; margin: 0; font-size: 14px;">建筑队列</h3>
                    <div style="display: flex; gap: 5px;">
                        <button id="start-queue" style="
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                        ">开始队列</button>
                        <button id="stop-queue" style="
                            background-color: #ff9800;
                            color: white;
                            border: none;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                            display: none;
                        ">停止队列</button>
                        <button id="clear-queue" style="
                            background-color: #f44336;
                            color: white;
                            border: none;
                            padding: 2px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                        ">清空队列</button>
                    </div>
                </div>
                <div id="building-queue-list" style="
                    max-height: 200px;
                    overflow-y: auto;
                    font-size: 12px;
                "></div>
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

    // 添加检查游戏建筑队列状态的方法
    function checkGameBuildingQueue() {
        // 获取建筑队列列表
        const queueList = document.querySelector('ul.buildingList');
        if (!queueList) {
            return {
                status: 'no_queue',
                message: '未找到建筑队列',
                currentCount: 0,
                maxCount: 0
            };
        }

        // 获取当前队列中的建筑数量
        const currentBuildings = queueList.querySelectorAll('li').length;

        // 检查是否为PLUS会员（通过检查是否有第二个建筑队列位置）
        const isPlusMember = document.querySelector('.plusFeature') !== null;
        const maxQueueSize = isPlusMember ? 2 : 1;

        return {
            status: currentBuildings >= maxQueueSize ? 'full' : 'available',
            message: currentBuildings >= maxQueueSize ? '建筑队列已满' : '建筑队列可用',
            currentCount: currentBuildings,
            maxCount: maxQueueSize,
            isPlusMember: isPlusMember
        };
    }

    // 添加资源检查等待状态管理
    const ResourceCheckManager = {
        isWaitingForResources: false,
        lastCheckTime: 0,
        checkInterval: 5000, // 检查间隔（毫秒）
        maxWaitTime: 30 * 60 * 1000, // 最大等待时间（30分钟）

        startWaiting: function() {
            this.isWaitingForResources = true;
            this.lastCheckTime = new Date().getTime();
            TravianAssistant.log('开始等待资源积累');
        },

        stopWaiting: function() {
            this.isWaitingForResources = false;
            this.lastCheckTime = 0;
            TravianAssistant.log('停止等待资源积累');
        },

        isWaiting: function() {
            return this.isWaitingForResources;
        },

        shouldCheckAgain: function() {
            const currentTime = new Date().getTime();
            return currentTime - this.lastCheckTime >= this.checkInterval;
        },

        isWaitTimeExceeded: function() {
            const currentTime = new Date().getTime();
            return currentTime - this.lastCheckTime >= this.maxWaitTime;
        }
    };

    // 添加计算资源积累时间的方法
    function calculateResourceAccumulationTime(currentResources, requiredResources, productionRates) {
        let maxTimeInHours = 0;
        const missingResources = {};

        for (const [resource, required] of Object.entries(requiredResources)) {
            const current = parseInt(currentResources[resource].库存.replace(/[^\d]/g, ''), 10);
            const production = productionRates[resource] || 0;
            
            if (current < required && production > 0) {
                const missing = required - current;
                const timeInHours = missing / production;
                maxTimeInHours = Math.max(maxTimeInHours, timeInHours);
                missingResources[resource] = {
                    当前: current,
                    需要: required,
                    缺少: missing,
                    每小时产量: production,
                    预计时间: timeInHours
                };
            }
        }

        return {
            最大等待时间: maxTimeInHours,
            资源详情: missingResources
        };
    }

    // 格式化时间显示
    function formatTimeDisplay(hours) {
        if (hours < 1) {
            return `${Math.ceil(hours * 60)}分钟`;
        }
        const wholeHours = Math.floor(hours);
        const minutes = Math.ceil((hours - wholeHours) * 60);
        if (minutes === 60) {
            return `${wholeHours + 1}小时`;
        }
        return `${wholeHours}小时${minutes}分钟`;
    }

    // 修改更新队列状态的方法
    function updateQueueStatus() {
        const startButton = document.getElementById('start-queue');
        const stopButton = document.getElementById('stop-queue');
        const clearButton = document.getElementById('clear-queue');
        const queueList = document.getElementById('building-queue-list');
        
        if (!startButton || !stopButton || !clearButton || !queueList) return;

        const isExecuting = BuildingQueueManager.getExecutionStatus();
        const queue = BuildingQueueManager.getCurrentQueue();

        // 更新按钮状态
        startButton.style.display = isExecuting ? 'none' : 'inline-block';
        stopButton.style.display = isExecuting ? 'inline-block' : 'none';
        clearButton.disabled = isExecuting;

        // 更新队列列表
        if (queue.length === 0) {
            queueList.innerHTML = '<div style="padding: 5px; color: #aaa;">队列为空</div>';
            return;
        }

        queueList.innerHTML = queue.map((building, index) => `
            <div style="
                padding: 5px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                ${index === 0 && isExecuting ? 'background-color: rgba(76,175,80,0.1);' : ''}
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="color: ${index === 0 && isExecuting ? '#4CAF50' : '#f0f0f0'}">
                            ${index + 1}. ${building.建筑类型} (等级 ${building.当前等级})
                        </span>
                        ${index === 0 && isExecuting ? 
                            '<span style="color: #4CAF50; margin-left: 5px;">(执行中)</span>' : ''}
                    </div>
                    <button class="remove-from-queue" data-index="${index}" style="
                        background-color: #f44336;
                        color: white;
                        border: none;
                        padding: 1px 5px;
                        border-radius: 2px;
                        cursor: pointer;
                        font-size: 11px;
                        ${isExecuting && index === 0 ? 'display: none;' : ''}
                    ">移除</button>
                </div>
                ${building.所需资源 ? `
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">
                        所需资源: ${Object.entries(building.所需资源)
                            .map(([resource, amount]) => `${resource}: ${amount}`)
                            .join(', ')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        // 添加移除按钮事件监听
        queueList.querySelectorAll('.remove-from-queue').forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-index'));
                BuildingQueueManager.removeFromQueueByIndex(index);
                updateQueueStatus();
            });
        });
    }
})(); 