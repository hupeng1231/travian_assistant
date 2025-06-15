// BuildingQueueManager.js - 建筑队列管理模块
const BuildingQueueManager = {
    currentQueue: [],
    isExecuting: false,
    executionInterval: null,
    isInitialized: false,

    init: function() {
        if (this.isInitialized) {
            window.TravianCore.log('建筑队列管理模块已经初始化', 'warn');
            return;
        }

        this.loadQueueState();
        this.isInitialized = true;
        window.TravianCore.log('建筑队列管理模块初始化完成');
    },

    loadQueueState: function() {
        try {
            const savedQueue = localStorage.getItem('travianBuildingQueue');
            if (savedQueue) {
                this.currentQueue = JSON.parse(savedQueue);
                window.TravianCore.log('已加载保存的建筑队列', 'debug');
            }
        } catch (error) {
            window.TravianCore.log(`加载建筑队列状态时出错: ${error.message}`, 'error');
        }
    },

    saveQueueState: function() {
        try {
            localStorage.setItem('travianBuildingQueue', JSON.stringify(this.currentQueue));
            window.TravianCore.log('已保存建筑队列状态', 'debug');
        } catch (error) {
            window.TravianCore.log(`保存建筑队列状态时出错: ${error.message}`, 'error');
        }
    },

    addToQueue: function(buildingInfo) {
        this.currentQueue.push(buildingInfo);
        this.saveQueueState();
        window.TravianCore.log(`已将建筑 ${buildingInfo.建筑类型} 添加到队列`, 'info');
    },

    removeFromQueueByIndex: function(index) {
        if (index >= 0 && index < this.currentQueue.length) {
            const removed = this.currentQueue.splice(index, 1)[0];
            this.saveQueueState();
            window.TravianCore.log(`已从队列中移除建筑 ${removed.建筑类型}`, 'info');
        }
    },

    clearQueue: function() {
        this.currentQueue = [];
        this.saveQueueState();
        window.TravianCore.log('已清空建筑队列', 'info');
    },

    getCurrentQueue: function() {
        return this.currentQueue;
    },

    startQueueExecution: function() {
        if (this.isExecuting) {
            window.TravianCore.log('建筑队列已在执行中', 'warn');
            return;
        }

        this.isExecuting = true;
        this.executionInterval = setInterval(() => this.executeNextBuilding(), 5000);
        window.TravianCore.log('开始执行建筑队列', 'info');
    },

    stopQueueExecution: function() {
        if (!this.isExecuting) {
            window.TravianCore.log('建筑队列未在执行', 'warn');
            return;
        }

        this.isExecuting = false;
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
            this.executionInterval = null;
        }
        window.TravianCore.log('停止执行建筑队列', 'info');
    },

    executeNextBuilding: async function() {
        // 检查队列是否在执行状态
        if (!this.isExecuting) {
            window.TravianCore.log('建筑队列未在执行状态', 'debug');
            return;
        }

        if (this.currentQueue.length === 0) {
            window.TravianCore.log('建筑队列为空', 'warn');
            this.stopQueueExecution();
            return;
        }

        const nextBuilding = this.currentQueue[0];
        const resources = window.TravianResourceManager.getCurrentResources();
        const requiredResources = nextBuilding.所需资源;

        if (!requiredResources) {
            window.TravianCore.log('无法获取建筑升级所需资源', 'warn');
            return;
        }

        // 检查资源是否足够
        const missingResources = {};
        let hasEnoughResources = true;

        for (const [type, amount] of Object.entries(requiredResources)) {
            const current = resources[type]?.库存 || 0;
            if (current < amount) {
                missingResources[type] = amount - current;
                hasEnoughResources = false;
            }
        }

        if (!hasEnoughResources) {
            // 计算等待时间
            const productionRates = window.TravianResourceManager.getProductionRates();
            const waitTimes = Object.entries(missingResources).map(([type, amount]) => {
                const production = productionRates[type] || 0;
                return production > 0 ? amount / production : Infinity;
            });

            const maxWaitTime = Math.max(...waitTimes);
            if (maxWaitTime === Infinity) {
                window.TravianCore.log('资源产量为0，无法自动升级建筑', 'warn');
                return;
            }

            window.TravianCore.log(`资源不足，等待 ${maxWaitTime.toFixed(1)} 小时`, 'info');
            return;
        }

        // 资源足够，执行升级
        try {
            // 如果不在建筑页面，先跳转到建筑页面
            if (!window.location.pathname.includes('build.php')) {
                // 在跳转前先移除当前建筑，避免重复升级
                this.removeFromQueueByIndex(0);
                window.location.href = nextBuilding.建设链接;
                return;
            }

            const upgradeButton = document.querySelector('button.green.build');
            if (upgradeButton) {
                // 在点击升级按钮前先移除当前建筑，避免重复升级
                this.removeFromQueueByIndex(0);
                upgradeButton.click();
                window.TravianCore.log(`开始升级 ${nextBuilding.建筑类型} 到 ${nextBuilding.目标等级} 级`, 'info');
                window.TravianUIManager.updateResourcePanel();
            } else {
                window.TravianCore.log('未找到升级按钮', 'warn');
            }
        } catch (error) {
            window.TravianCore.log(`执行建筑升级时出错: ${error.message}`, 'error');
        }
    }
};

// 导出为全局变量
window.TravianBuildingQueueManager = BuildingQueueManager; 