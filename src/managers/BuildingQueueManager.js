// BuildingQueueManager.js - 建筑队列管理模块
const BuildingQueueManager = {
    currentQueue: [],
    isExecuting: false,
    executionInterval: null,

    init: function() {
        this.loadQueueState();
        this.startQueueExecution();
        window.TravianCore.log('建筑队列管理模块初始化完成');
    },

    addToQueue: function(building) {
        this.currentQueue.push(building);
        this.saveQueueState();
        window.TravianCore.log(`添加建筑到队列: ${building.建筑类型}`);
    },

    removeFromQueue: function(buildingId) {
        this.currentQueue = this.currentQueue.filter(b => b.地块ID !== buildingId);
        this.saveQueueState();
        window.TravianCore.log(`从队列中移除建筑: ${buildingId}`);
    },

    executeNextBuilding: async function() {
        if (!this.currentQueue.length || this.isExecuting) return;

        this.isExecuting = true;
        const nextBuilding = this.currentQueue[0];

        try {
            const buildingDetail = window.TravianCore.modules.buildingDetail;
            if (!buildingDetail) {
                throw new Error('建筑详情模块未初始化');
            }

            const success = await buildingDetail.executeUpgrade(nextBuilding);
            if (success) {
                this.removeFromQueue(nextBuilding.地块ID);
            }
        } catch (error) {
            window.TravianCore.log(`执行建筑升级失败: ${error.message}`, 'error');
        } finally {
            this.isExecuting = false;
        }
    },

    startQueueExecution: function() {
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
        }

        this.executionInterval = setInterval(() => {
            this.executeNextBuilding();
        }, 10000);
    },

    saveQueueState: function() {
        localStorage.setItem('buildingQueue', JSON.stringify(this.currentQueue));
    },

    loadQueueState: function() {
        const savedQueue = localStorage.getItem('buildingQueue');
        if (savedQueue) {
            this.currentQueue = JSON.parse(savedQueue);
            window.TravianCore.log(`已加载 ${this.currentQueue.length} 个建筑队列项`);
        }
    },

    getCurrentQueue: function() {
        return [...this.currentQueue];
    },

    clearQueue: function() {
        this.currentQueue = [];
        this.saveQueueState();
        window.TravianCore.log('建筑队列已清空');
    },

    updateQueueStatus: function() {
        const ui = window.TravianCore.modules.ui;
        if (ui && typeof ui.updateBuildingQueue === 'function') {
            ui.updateBuildingQueue(this.currentQueue);
        }
    }
};

// 导出为全局变量
window.TravianBuildingQueueManager = BuildingQueueManager; 