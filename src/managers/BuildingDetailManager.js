// BuildingDetailManager.js - 建筑详情管理模块
const BuildingDetailManager = {
    resourceCheckInterval: null,

    init: function() {
        if (window.location.pathname.includes('build.php')) {
            this.initializeBuildingDetail();
        }
    },

    initializeBuildingDetail: function() {
        const ui = window.TravianCore.modules.ui;
        if (ui) {
            ui.createResourcePanel();
        }
        this.startResourceCheck();
        window.TravianCore.log('建筑详情模块初始化完成');
    },

    executeUpgrade: async function(buildingInfo) {
        try {
            const building = buildingInfo || this.getCurrentBuildingFromState();
            if (!building) {
                window.TravianCore.log('未找到建筑信息', 'error');
                return false;
            }

            // 检查建筑队列状态
            const queueStatus = this.checkBuildingQueueStatus();
            window.TravianCore.log(`建筑队列状态: ${queueStatus.message}`);

            // 检查资源是否足够
            const resources = window.TravianResourceManager.getCurrentResources();
            if (window.location.pathname.includes('build.php')) {
                building.所需资源 = this.getBuildingUpgradeRequirements();
                // 更新队列中的建筑信息
                const buildingQueue = window.TravianCore.modules.buildingQueue;
                if (buildingQueue) {
                    const index = buildingQueue.currentQueue.findIndex(b => b.地块ID === building.地块ID);
                    if (index !== -1) {
                        buildingQueue.currentQueue[index].所需资源 = building.所需资源;
                        buildingQueue.saveQueueState();
                    }
                }
            }

            // 检查资源是否足够
            const hasEnoughResources = this.checkResources(building.所需资源, resources);
            if (!hasEnoughResources) {
                return false;
            }

            // 执行升级
            const upgradeButton = document.querySelector('button.green.build');
            if (upgradeButton) {
                upgradeButton.click();
                window.TravianCore.log(`开始升级建筑: ${building.建筑类型}`);
                return true;
            } else {
                window.TravianCore.log('未找到升级按钮', 'error');
                return false;
            }
        } catch (error) {
            window.TravianCore.log(`执行升级时出错: ${error.message}`, 'error');
            return false;
        }
    },

    checkBuildingQueueStatus: function() {
        const queueElement = document.querySelector('#queue');
        if (!queueElement) {
            return { status: 'empty', message: '建筑队列为空' };
        }

        const queueItems = queueElement.querySelectorAll('.listEntry');
        return {
            status: queueItems.length > 0 ? 'busy' : 'empty',
            message: `当前队列中有 ${queueItems.length} 个建筑正在升级`
        };
    },

    getBuildingUpgradeRequirements: function() {
        const requirements = {};
        const resourceTypes = ['wood', 'clay', 'iron', 'crop'];
        
        resourceTypes.forEach(type => {
            const element = document.querySelector(`#costs .resource.${type}`);
            if (element) {
                requirements[type] = parseInt(element.textContent.replace(/[^0-9]/g, ''), 10);
            }
        });

        return requirements;
    },

    checkResources: function(required, current) {
        for (const [resource, amount] of Object.entries(required)) {
            if (!current[resource] || current[resource].库存 < amount) {
                window.TravianCore.log(`资源不足: ${resource} (需要: ${amount}, 当前: ${current[resource]?.库存 || 0})`);
                return false;
            }
        }
        return true;
    },

    getCurrentBuildingFromState: function() {
        try {
            const buildingQueue = window.TravianCore.modules.buildingQueue;
            if (!buildingQueue || !buildingQueue.currentQueue.length) {
                return null;
            }

            const firstBuilding = buildingQueue.currentQueue[0];
            const currentBuildingId = this.getCurrentBuildingId();
            const currentBuildingType = this.getCurrentBuildingType();

            if (currentBuildingId && currentBuildingType) {
                if (currentBuildingId === firstBuilding.地块ID && 
                    currentBuildingType === firstBuilding.建筑类型ID) {
                    window.TravianCore.log(`当前页面匹配队列中的建筑: ${firstBuilding.建筑类型}`);
                    return firstBuilding;
                } else {
                    window.TravianCore.log(`当前页面不匹配队列中的建筑:
                        当前页面: ID=${currentBuildingId}, 类型=${currentBuildingType}
                        队列建筑: ID=${firstBuilding.地块ID}, 类型=${firstBuilding.建筑类型ID}`);
                    return null;
                }
            }
        } catch (error) {
            window.TravianCore.log(`获取当前建筑信息时出错: ${error.message}`, 'error');
        }
        return null;
    },

    getCurrentBuildingId: function() {
        const match = window.location.href.match(/id=(\d+)/);
        return match ? match[1] : null;
    },

    getCurrentBuildingType: function() {
        const match = window.location.href.match(/gid=(\d+)/);
        return match ? match[1] : null;
    },

    startResourceCheck: function() {
        if (this.resourceCheckInterval) {
            clearInterval(this.resourceCheckInterval);
        }

        this.resourceCheckInterval = setInterval(() => {
            if (window.TravianResourceManager.shouldCheckAgain()) {
                this.checkAndExecuteUpgrade();
            }
        }, window.TravianResourceManager.checkInterval);
    }
};

// 导出为全局变量
window.TravianBuildingDetailManager = BuildingDetailManager; 