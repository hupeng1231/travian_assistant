// BuildingQueueManager.js - 建筑队列管理模块
const BuildingQueueManager = {
    currentQueue: [],
    isWaiting: false,
    lastCheckTime: 0,
    maxWaitTime: 0,
    expectedWaitTime: 0,

    init: function() {
        this.startQueueCheck();
        window.TravianCore.log('建筑队列管理模块初始化完成');
    },

    startWaiting: function(expectedWaitTimeInHours = 0) {
        this.isWaiting = true;
        this.lastCheckTime = new Date().getTime();
        this.expectedWaitTime = expectedWaitTimeInHours * 3600000;
        this.maxWaitTime = this.expectedWaitTime * 1.5;
        window.TravianCore.log(`开始等待建筑队列，预计等待时间: ${expectedWaitTimeInHours.toFixed(1)}小时`);
    },

    stopWaiting: function() {
        this.isWaiting = false;
        this.lastCheckTime = 0;
        this.maxWaitTime = 0;
        this.expectedWaitTime = 0;
        window.TravianCore.log('停止等待建筑队列');
    },

    shouldCheckAgain: function() {
        if (!this.isWaiting) return false;
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - this.lastCheckTime;
        
        if (elapsedTime >= this.maxWaitTime) {
            window.TravianCore.log('建筑队列等待超时，停止检查');
            return false;
        }

        return elapsedTime < this.expectedWaitTime * 0.5 ? 
            currentTime - this.lastCheckTime >= 30000 : 
            currentTime - this.lastCheckTime >= 60000;
    },

    checkBuildingQueueStatus: function() {
        const queueElement = document.querySelector('#queue');
        if (!queueElement) {
            window.TravianCore.log('未找到建筑队列元素', 'warn');
            return;
        }

        const queueEntries = queueElement.querySelectorAll('.listEntry');
        this.currentQueue = Array.from(queueEntries).map(entry => {
            const buildingName = entry.querySelector('.name').textContent.trim();
            const levelMatch = buildingName.match(/→ 等级 (\d+)/);
            const targetLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;
            const timeLeft = entry.querySelector('.timer').textContent.trim();
            
            return {
                建筑名称: buildingName.split('→')[0].trim(),
                目标等级: targetLevel,
                剩余时间: timeLeft,
                所需资源: this.getBuildingUpgradeRequirements(buildingName, targetLevel)
            };
        });

        window.TravianCore.log('当前建筑队列:', this.currentQueue, 'debug');
        return this.currentQueue;
    },

    getBuildingUpgradeRequirements: function(buildingName, targetLevel) {
        // 这里需要根据建筑名称和目标等级获取升级所需资源
        // 暂时返回空对象，后续可以根据游戏数据完善
        return {};
    },

    updateBuildingQueue: function() {
        if (window.location.pathname.includes('build.php')) {
            this.checkBuildingQueueStatus();
        }
    },

    startQueueCheck: function() {
        setInterval(() => {
            if (this.shouldCheckAgain()) {
                this.updateBuildingQueue();
            }
        }, 5000);
    },

    executeNextBuilding: async function() {
        if (this.currentQueue.length === 0) {
            window.TravianCore.log('建筑队列为空', 'warn');
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
            this.startWaiting(maxWaitTime);
            return;
        }

        // 资源足够，执行升级
        try {
            const upgradeButton = document.querySelector('button.green.build');
            if (upgradeButton) {
                upgradeButton.click();
                window.TravianCore.log(`开始升级 ${nextBuilding.建筑名称} 到 ${nextBuilding.目标等级} 级`, 'info');
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