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
        
        resourceTypes.forEach(type => {
            const stockElement = document.getElementById(`l${type}`);
            const productionElement = document.getElementById(`production${type}`);
            
            if (stockElement && productionElement) {
                resources[type] = {
                    库存: parseInt(stockElement.textContent.replace(/[^0-9]/g, ''), 10),
                    每小时产量: parseInt(productionElement.textContent.replace(/[^0-9-]/g, ''), 10)
                };
            }
        });

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
        // 这里可以添加具体的资源检查逻辑
        // 例如检查是否达到某个阈值，或者触发某些事件
    }
};

// 导出为全局变量
window.TravianResourceManager = ResourceManager; 