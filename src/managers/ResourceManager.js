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

    init: function() {
        this.startResourceCheck();
        window.TravianCore.log('资源管理模块初始化完成');
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
    }
};

// 导出为全局变量
window.TravianResourceManager = ResourceManager; 