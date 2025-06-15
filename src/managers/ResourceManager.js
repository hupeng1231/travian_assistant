// ResourceManager.js - 资源管理模块
const ResourceManager = {
    checkInterval: 5000,
    isWaiting: false,
    lastCheckTime: 0,
    maxWaitTime: 0,
    expectedWaitTime: 0,

    // 资源建筑类型映射
    RESOURCE_BUILDING_TYPES: {
        1: '伐木场',
        2: '泥坑',
        3: '铁矿',
        4: '农田'
    },

    // 资源历史记录
    resourceHistory: {
        木材: [],
        粘土: [],
        铁: [],
        麦子: []
    },

    // 产量历史记录
    productionHistory: {
        木材: [],
        粘土: [],
        铁: [],
        麦子: []
    },

    // 上次记录时间戳
    lastRecordTimestamp: 0,

    // 更新间隔（15分钟）
    UPDATE_INTERVAL: 15 * 60 * 1000,

    // 初始化资源管理器
    init: async function() {
        try {
            // 检查 GM API 是否可用
            if (typeof GM_getValue === 'undefined') {
                console.warn('[Travian助手] GM API 不可用，使用内存存储作为回退');
                this.useMemoryStorage = true;
                this.memoryStorage = {};
            } else {
                this.useMemoryStorage = false;
            }

            // 初始化资源历史记录
            this.resourceHistory = {};
            this.productionHistory = {};
            
            // 从存储中加载历史数据
            await this.loadResourceHistory();
            
            // 开始定期更新
            this.startPeriodicUpdate();
            
            console.log('[Travian助手] 资源管理模块初始化完成');
            return true;
        } catch (error) {
            console.error('[Travian助手] 资源管理模块初始化失败:', error);
            return false;
        }
    },

    // 从存储中加载资源历史数据
    loadResourceHistory: async function() {
        try {
            if (this.useMemoryStorage) {
                // 使用内存存储
                this.resourceHistory = this.memoryStorage.resourceHistory || {};
                this.productionHistory = this.memoryStorage.productionHistory || {};
            } else {
                // 使用 GM API
                this.resourceHistory = JSON.parse(GM_getValue('resourceHistory', '{}'));
                this.productionHistory = JSON.parse(GM_getValue('productionHistory', '{}'));
            }
        } catch (error) {
            console.warn('[Travian助手] 加载资源历史数据失败:', error);
            this.resourceHistory = {};
            this.productionHistory = {};
        }
    },

    // 保存资源历史数据
    saveResourceHistory: async function() {
        try {
            const data = {
                resourceHistory: this.resourceHistory,
                productionHistory: this.productionHistory
            };

            if (this.useMemoryStorage) {
                // 使用内存存储
                this.memoryStorage = { ...this.memoryStorage, ...data };
            } else {
                // 使用 GM API
                GM_setValue('resourceHistory', JSON.stringify(this.resourceHistory));
                GM_setValue('productionHistory', JSON.stringify(this.productionHistory));
            }
        } catch (error) {
            console.warn('[Travian助手] 保存资源历史数据失败:', error);
        }
    },

    startWaiting: function(expectedWaitTimeInHours = 0) {
        this.isWaiting = true;
        this.lastCheckTime = new Date().getTime();
        this.expectedWaitTime = expectedWaitTimeInHours * 3600000;
        this.maxWaitTime = this.expectedWaitTime * 1.5;
        window.TravianCore.log(`开始等待资源积累，预计等待时间: ${expectedWaitTimeInHours.toFixed(1)}小时`);
    },

    stopWaiting: function() {
        this.isWaiting = false;
        this.lastCheckTime = 0;
        this.maxWaitTime = 0;
        this.expectedWaitTime = 0;
        window.TravianCore.log('停止等待资源积累');
    },

    shouldCheckAgain: function() {
        if (!this.isWaiting) return false;
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - this.lastCheckTime;
        
        if (elapsedTime >= this.maxWaitTime) {
            window.TravianCore.log('资源积累超时，停止检查');
            return false;
        }

        return elapsedTime < this.expectedWaitTime * 0.5 ? 
            currentTime - this.lastCheckTime >= 30000 : 
            currentTime - this.lastCheckTime >= 60000;
    },

    getCurrentResources: function() {
        return this.collectResourceInfo();
    },

    // 从页面获取资源信息
    getResourcesFromPageScript: function() {
        try {
            // 尝试从页面的全局变量获取资源信息
            if (typeof window.resources !== 'undefined') {
                return window.resources;
            }
            return null;
        } catch (error) {
            window.TravianCore.log('从页面脚本获取资源信息失败:', error, 'warn');
            return null;
        }
    },

    // 收集资源信息
    collectResourceInfo: function() {
        const resources = {};
        const resourceTypes = ['wood', 'clay', 'iron', 'crop'];
        const resourceIndices = {
            wood: 1,
            clay: 2,
            iron: 3,
            crop: 4
        };

        // 首先尝试从页面脚本获取
        const pageResources = this.getResourcesFromPageScript();
        if (pageResources) {
            window.TravianCore.log('从页面脚本获取到资源信息:', pageResources, 'debug');
            return pageResources;
        }
        
        // 如果页面脚本获取失败，则从DOM获取
        resourceTypes.forEach(type => {
            const index = resourceIndices[type];
            // 获取库存
            const stockElement = document.querySelector(`#l${index}.value`);
            // 获取产量
            const productionElement = document.querySelector(`#production tr:nth-child(${index}) td:nth-child(2)`);
            
            if (stockElement && productionElement) {
                const stockText = stockElement.textContent.trim();
                const productionText = productionElement.textContent.trim();
                
                window.TravianCore.log(`收集资源信息 - ${type}:`, {
                    stockElement: stockElement,
                    productionElement: productionElement,
                    stockText: stockText,
                    productionText: productionText
                }, 'debug');

                resources[type] = {
                    库存: parseInt(stockText.replace(/[^0-9]/g, ''), 10) || 0,
                    每小时产量: parseInt(productionText.replace(/[^0-9-]/g, ''), 10) || 0
                };
            } else {
                window.TravianCore.log(`未找到资源元素 - ${type}:`, {
                    stockElement: stockElement,
                    productionElement: productionElement
                }, 'warn');
            }
        });

        // 收集额外的游戏信息
        const additionalInfo = this.collectAdditionalGameInfo();
        Object.assign(resources, additionalInfo);

        window.TravianCore.log('收集到的资源信息:', resources, 'debug');
        return resources;
    },

    // 收集额外的游戏信息
    collectAdditionalGameInfo: function() {
        const info = {};
        try {
            // 获取当前人口
            const populationElement = document.querySelector('#pop_current');
            if (populationElement) {
                info.当前人口 = parseInt(populationElement.textContent.trim(), 10) || 0;
            }

            // 获取最大人口
            const maxPopulationElement = document.querySelector('#pop_max');
            if (maxPopulationElement) {
                info.最大人口 = parseInt(maxPopulationElement.textContent.trim(), 10) || 0;
            }

            // 获取当前建筑队列状态
            const queueElement = document.querySelector('#queue');
            if (queueElement) {
                info.建筑队列状态 = queueElement.querySelectorAll('.listEntry').length;
            }

            // 获取资源建筑等级
            const resourceBuildings = {};
            for (let i = 1; i <= 4; i++) {
                const buildingElement = document.querySelector(`#production tr:nth-child(${i}) td:nth-child(1) a`);
                if (buildingElement) {
                    const levelMatch = buildingElement.textContent.match(/等级 (\d+)/);
                    if (levelMatch) {
                        resourceBuildings[this.RESOURCE_BUILDING_TYPES[i]] = parseInt(levelMatch[1], 10);
                    }
                }
            }
            info.资源建筑等级 = resourceBuildings;

        } catch (error) {
            window.TravianCore.log('收集额外游戏信息时出错:', error, 'warn');
        }
        return info;
    },

    getProductionRates: function() {
        const resources = this.collectResourceInfo();
        return Object.fromEntries(
            Object.entries(resources).map(([k, v]) => [k, v.每小时产量 || 0])
        );
    },

    calculateAccumulationTime: function(currentResources, requiredResources) {
        const productionRates = this.getProductionRates();
        return window.TravianUtils.calculateResourceAccumulationTime(
            currentResources,
            requiredResources,
            productionRates
        );
    },

    startResourceCheck: function() {
        setInterval(() => {
            if (this.shouldCheckAgain()) {
                this.checkResources();
            }
        }, this.checkInterval);
    },

    checkResources: function() {
        const currentResources = this.getCurrentResources();
        window.TravianCore.log('当前资源状态:', currentResources, 'debug');
    },

    // 获取资源建筑信息
    getResourceBuildings: function() {
        const resourceBuildings = {
            伐木场: [],
            泥坑: [],
            铁矿: [],
            农田: []
        };

        try {
            // 查找所有资源建筑
            const buildings = document.querySelectorAll('.resourceField[data-gid]');
            
            buildings.forEach(building => {
                const gid = building.getAttribute('data-gid');
                const aid = building.getAttribute('data-aid');
                const levelEl = building.querySelector('.labelLayer');
                const currentLevel = levelEl ? parseInt(levelEl.textContent || 0) : 0;
                const buildUrl = building.getAttribute('href');
                const canUpgrade = !building.classList.contains('notNow');

                const buildingInfo = {
                    建筑类型: this.RESOURCE_BUILDING_TYPES[gid],
                    地块ID: aid,
                    当前等级: currentLevel,
                    建设链接: buildUrl,
                    可升级: canUpgrade,
                    升级所需资源: this.getBuildingUpgradeRequirements(this.RESOURCE_BUILDING_TYPES[gid], currentLevel + 1)
                };

                // 确保类型存在再添加
                if (this.RESOURCE_BUILDING_TYPES[gid]) {
                    resourceBuildings[this.RESOURCE_BUILDING_TYPES[gid]].push(buildingInfo);
                }
            });

            window.TravianCore.log('收集到的资源建筑信息:', resourceBuildings, 'debug');
            return resourceBuildings;
        } catch (error) {
            window.TravianCore.log(`获取资源建筑信息时出错: ${error.message}`, 'error');
            return resourceBuildings;
        }
    },

    // 获取建筑升级所需资源
    getBuildingUpgradeRequirements: function(buildingType, targetLevel) {
        // 这里需要根据建筑类型和目标等级获取升级所需资源
        // 暂时返回空对象，后续可以根据游戏数据完善
        return {};
    },

    // 初始化资源历史记录
    initResourceHistory: function() {
        // 从存储中加载历史数据
        const savedHistory = GM_getValue('resourceHistory');
        const savedProduction = GM_getValue('productionHistory');
        const savedTimestamp = GM_getValue('lastRecordTimestamp');

        if (savedHistory) this.resourceHistory = savedHistory;
        if (savedProduction) this.productionHistory = savedProduction;
        if (savedTimestamp) this.lastRecordTimestamp = savedTimestamp;

        // 启动定时记录
        setInterval(() => this.recordResourceData(), this.UPDATE_INTERVAL);
    },

    // 记录资源数据
    recordResourceData: function() {
        const now = Date.now();
        const resources = this.getCurrentResources();
        const productionRates = this.getProductionRates();

        // 记录资源数据
        Object.entries(resources).forEach(([type, info]) => {
            if (this.resourceHistory[type]) {
                this.resourceHistory[type].push({
                    timestamp: now,
                    amount: info.库存,
                    capacity: info.容量
                });

                // 只保留最近24小时的数据
                const oneDayAgo = now - 24 * 60 * 60 * 1000;
                this.resourceHistory[type] = this.resourceHistory[type].filter(
                    record => record.timestamp > oneDayAgo
                );
            }
        });

        // 记录产量数据
        Object.entries(productionRates).forEach(([type, rate]) => {
            if (this.productionHistory[type]) {
                this.productionHistory[type].push({
                    timestamp: now,
                    rate: rate
                });

                // 只保留最近24小时的数据
                const oneDayAgo = now - 24 * 60 * 60 * 1000;
                this.productionHistory[type] = this.productionHistory[type].filter(
                    record => record.timestamp > oneDayAgo
                );
            }
        });

        this.lastRecordTimestamp = now;

        // 保存到存储
        GM_setValue('resourceHistory', this.resourceHistory);
        GM_setValue('productionHistory', this.productionHistory);
        GM_setValue('lastRecordTimestamp', this.lastRecordTimestamp);

        window.TravianCore.log('资源历史数据已更新', 'debug');
    },

    // 获取资源历史数据
    getResourceHistory: function(type, hours = 24) {
        if (!this.resourceHistory[type]) return [];
        
        const now = Date.now();
        const startTime = now - hours * 60 * 60 * 1000;
        
        return this.resourceHistory[type].filter(
            record => record.timestamp >= startTime
        );
    },

    // 获取产量历史数据
    getProductionHistory: function(type, hours = 24) {
        if (!this.productionHistory[type]) return [];
        
        const now = Date.now();
        const startTime = now - hours * 60 * 60 * 1000;
        
        return this.productionHistory[type].filter(
            record => record.timestamp >= startTime
        );
    },

    // 计算资源积累时间
    calculateResourceAccumulationTime: function(currentResources, requiredResources, productionRates) {
        const missingResources = {};
        let maxTime = 0;
        let totalMissing = 0;

        // 计算每种资源所需时间
        for (const [type, amount] of Object.entries(requiredResources)) {
            const current = currentResources[type]?.库存 || 0;
            const production = productionRates[type] || 0;
            const capacity = currentResources[type]?.容量 || 0;

            if (current < amount) {
                const missing = amount - current;
                totalMissing += missing;

                if (production <= 0) {
                    return {
                        maxTime: Infinity,
                        details: {
                            [type]: {
                                missing: missing,
                                time: Infinity,
                                reason: '产量为0'
                            }
                        },
                        totalMissing: totalMissing,
                        canAccumulate: false,
                        reason: `${type}产量为0`
                    };
                }

                // 检查是否会超出容量
                if (current + missing > capacity) {
                    return {
                        maxTime: Infinity,
                        details: {
                            [type]: {
                                missing: missing,
                                time: Infinity,
                                reason: '超出容量限制'
                            }
                        },
                        totalMissing: totalMissing,
                        canAccumulate: false,
                        reason: `${type}超出容量限制`
                    };
                }

                const time = missing / production;
                missingResources[type] = {
                    missing: missing,
                    time: time,
                    production: production,
                    current: current,
                    capacity: capacity
                };
                maxTime = Math.max(maxTime, time);
            }
        }

        // 计算资源积累效率
        const efficiency = Object.entries(missingResources).reduce((sum, [type, info]) => {
            return sum + (info.missing / info.time);
        }, 0) / Object.keys(missingResources).length;

        return {
            maxTime: maxTime,
            details: missingResources,
            totalMissing: totalMissing,
            canAccumulate: true,
            efficiency: efficiency,
            formattedTime: this.formatTimeDisplay(maxTime)
        };
    },

    // 计算资源积累建议
    calculateResourceAccumulationAdvice: function(currentResources, requiredResources, productionRates) {
        const result = this.calculateResourceAccumulationTime(currentResources, requiredResources, productionRates);
        
        if (!result.canAccumulate) {
            return {
                canAccumulate: false,
                reason: result.reason,
                advice: this.getResourceAccumulationAdvice(result.details)
            };
        }

        // 分析资源积累情况
        const analysis = Object.entries(result.details).map(([type, info]) => {
            const percentage = (info.missing / info.capacity) * 100;
            let status = '正常';
            let advice = '';

            if (percentage > 80) {
                status = '严重不足';
                advice = '建议优先升级仓库';
            } else if (percentage > 50) {
                status = '不足';
                advice = '可以考虑升级仓库';
            } else if (info.time > 24) {
                status = '积累缓慢';
                advice = '建议提高产量';
            }

            return {
                type: type,
                status: status,
                percentage: percentage,
                advice: advice,
                details: info
            };
        });

        return {
            canAccumulate: true,
            maxTime: result.maxTime,
            formattedTime: result.formattedTime,
            efficiency: result.efficiency,
            analysis: analysis,
            advice: this.getResourceAccumulationAdvice(result.details)
        };
    },

    // 获取资源积累建议
    getResourceAccumulationAdvice: function(resourceDetails) {
        const advice = [];
        const sortedResources = Object.entries(resourceDetails)
            .sort((a, b) => b[1].time - a[1].time);

        // 分析最慢的资源
        const slowestResource = sortedResources[0];
        if (slowestResource) {
            const [type, info] = slowestResource;
            if (info.time > 24) {
                advice.push(`建议优先提高${type}产量`);
            }
        }

        // 分析资源比例
        const totalMissing = Object.values(resourceDetails)
            .reduce((sum, info) => sum + info.missing, 0);
        
        Object.entries(resourceDetails).forEach(([type, info]) => {
            const percentage = (info.missing / totalMissing) * 100;
            if (percentage > 40) {
                advice.push(`${type}需求较大，建议优先积累`);
            }
        });

        return advice;
    },

    // 格式化时间显示
    formatTimeDisplay: function(hours) {
        if (hours === Infinity) return '无法积累';
        
        const days = Math.floor(hours / 24);
        const remainingHours = Math.floor(hours % 24);
        const minutes = Math.floor((hours * 60) % 60);
        
        let result = '';
        if (days > 0) result += `${days}天`;
        if (remainingHours > 0) result += `${remainingHours}小时`;
        if (minutes > 0) result += `${minutes}分钟`;
        
        return result || '0分钟';
    }
};

// 导出为全局变量
window.TravianResourceManager = ResourceManager; 