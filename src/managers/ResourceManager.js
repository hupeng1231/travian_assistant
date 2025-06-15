// ResourceManager.js - 资源管理模块
const ResourceManager = {
    checkInterval: 5000,
    isWaiting: false,
    lastCheckTime: 0,
    maxWaitTime: 0,
    expectedWaitTime: 0,

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

    collectResourceInfo: function() {
        const resources = {};
        const resourceTypes = ['wood', 'clay', 'iron', 'crop'];
        const resourceIndices = {
            wood: 1,
            clay: 2,
            iron: 3,
            crop: 4
        };
        
        resourceTypes.forEach(type => {
            const index = resourceIndices[type];
            // 获取库存 - 使用数字索引
            const stockElement = document.querySelector(`#l${index}.value`);
            // 获取产量 - 从 production 表格中获取
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

        window.TravianCore.log('收集到的资源信息:', resources, 'debug');
        return resources;
    },

    getProductionRates: function() {
        const resources = this.collectResourceInfo();
        return Object.fromEntries(
            Object.entries(resources).map(([k, v]) => [k, v.每小时产量 || 0])
        );
    },

    calculateAccumulationTime: function(currentResources, requiredResources) {
        const productionRates = this.getProductionRates();
        return Utils.calculateResourceAccumulationTime(
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
        // 这里可以添加具体的资源检查逻辑
        // 例如检查是否达到某个阈值，或者触发某些事件
    }
};

// 导出为全局变量
window.TravianResourceManager = ResourceManager; 