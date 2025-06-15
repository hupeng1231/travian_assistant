// UIManager.js - 用户界面管理模块
const UIManager = {
    panel: null,
    updateInterval: null,
    expandedBuildings: new Set(), // 记录展开的建筑列表

    init: function() {
        this.createResourcePanel();
        // 降低更新频率到30秒
        this.updateInterval = setInterval(() => this.updateResourcePanel(), 30000);
        this.updateResourcePanel();
        this.addEventListeners();
    },

    createResourcePanel: function() {
        // ... existing code ...

        // 修改建筑列表点击事件处理
        const buildingList = document.createElement('div');
        buildingList.className = 'building-list';
        buildingList.innerHTML = `
            <div class="building-list-header">
                <span>建筑队列</span>
                <button class="toggle-all">展开全部</button>
            </div>
            <div class="building-list-content"></div>
        `;

        // 添加展开/折叠全部按钮的事件处理
        const toggleAllButton = buildingList.querySelector('.toggle-all');
        toggleAllButton.addEventListener('click', () => {
            const isExpanding = toggleAllButton.textContent === '展开全部';
            const buildingItems = buildingList.querySelectorAll('.building-item');
            
            buildingItems.forEach(item => {
                const content = item.querySelector('.building-content');
                if (isExpanding) {
                    content.style.display = 'block';
                    this.expandedBuildings.add(item.dataset.buildingType);
                } else {
                    content.style.display = 'none';
                    this.expandedBuildings.delete(item.dataset.buildingType);
                }
            });
            
            toggleAllButton.textContent = isExpanding ? '折叠全部' : '展开全部';
        });

        // ... rest of the code ...
    },

    updateResourcePanel: function() {
        if (!this.panel) return;

        // 保存当前展开状态
        const currentExpanded = new Set(this.expandedBuildings);
        
        // 更新资源信息
        const resources = window.TravianResourceManager.getCurrentResources();
        const productionRates = window.TravianResourceManager.getProductionRates();
        const resourceBuildings = window.TravianResourceManager.getResourceBuildings();
        const buildingQueue = window.TravianBuildingQueueManager.getCurrentQueue();

        // 更新资源显示
        Object.entries(resources).forEach(([type, info]) => {
            const resourceEl = this.panel.querySelector(`.resource-item[data-type="${type}"]`);
            if (resourceEl) {
                const production = productionRates[type] || 0;
                const nextLevel = this.getNextLevelProduction(type, info.当前等级);
                const timeToFull = production > 0 ? (info.容量 - info.库存) / production : 0;
                
                // 获取资源历史数据
                const resourceHistory = window.TravianResourceManager.getResourceHistory(type, 24);
                const productionHistory = window.TravianResourceManager.getProductionHistory(type, 24);
                
                // 计算24小时内的资源变化
                const resourceChange = resourceHistory.length > 1 ? 
                    resourceHistory[resourceHistory.length - 1].amount - resourceHistory[0].amount : 0;
                
                // 计算平均产量
                const avgProduction = productionHistory.length > 0 ?
                    productionHistory.reduce((sum, record) => sum + record.rate, 0) / productionHistory.length : 0;

                // 获取资源积累建议
                const requiredResources = this.getRequiredResourcesForNextUpgrade(type, info.当前等级);
                const accumulationAdvice = window.TravianResourceManager.calculateResourceAccumulationAdvice(
                    resources,
                    requiredResources,
                    productionRates
                );
                
                resourceEl.innerHTML = `
                    <div class="resource-info">
                        <span class="resource-name">${type}</span>
                        <span class="resource-amount">${info.库存}/${info.容量}</span>
                        <span class="resource-production">+${production.toFixed(1)}/小时</span>
                    </div>
                    <div class="resource-progress">
                        <div class="progress-bar" style="width: ${(info.库存 / info.容量 * 100).toFixed(1)}%"></div>
                    </div>
                    <div class="resource-details">
                        <span>升级后产量: +${nextLevel.toFixed(1)}/小时</span>
                        <span>预计 ${window.TravianResourceManager.formatTimeDisplay(timeToFull)} 后满仓</span>
                        <span>24小时变化: ${resourceChange > 0 ? '+' : ''}${resourceChange.toFixed(0)}</span>
                        <span>平均产量: ${avgProduction.toFixed(1)}/小时</span>
                    </div>
                    ${accumulationAdvice.canAccumulate ? `
                        <div class="resource-advice">
                            <div class="advice-header">资源积累分析</div>
                            <div class="advice-content">
                                <div class="advice-time">预计积累时间: ${accumulationAdvice.formattedTime}</div>
                                <div class="advice-efficiency">积累效率: ${accumulationAdvice.efficiency.toFixed(1)}/小时</div>
                                ${accumulationAdvice.analysis.map(item => `
                                    <div class="advice-item ${item.status.toLowerCase()}">
                                        <span class="advice-type">${item.type}</span>
                                        <span class="advice-status">${item.status}</span>
                                        <span class="advice-percentage">${item.percentage.toFixed(1)}%</span>
                                        <span class="advice-text">${item.advice}</span>
                                    </div>
                                `).join('')}
                                ${accumulationAdvice.advice.length > 0 ? `
                                    <div class="advice-suggestions">
                                        ${accumulationAdvice.advice.map(text => `
                                            <div class="advice-suggestion">${text}</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : `
                        <div class="resource-advice error">
                            <div class="advice-header">资源积累分析</div>
                            <div class="advice-content">
                                <div class="advice-error">无法积累: ${accumulationAdvice.reason}</div>
                                ${accumulationAdvice.advice.length > 0 ? `
                                    <div class="advice-suggestions">
                                        ${accumulationAdvice.advice.map(text => `
                                            <div class="advice-suggestion">${text}</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `}
                `;
            }
        });

        // 更新建筑列表
        const buildingListContent = this.panel.querySelector('.building-list-content');
        if (buildingListContent) {
            buildingListContent.innerHTML = '';

            // 按建筑类型分组显示
            const buildingGroups = {};
            Object.entries(resourceBuildings).forEach(([type, buildings]) => {
                buildingGroups[type] = buildings;
            });

            Object.entries(buildingGroups).forEach(([type, buildings]) => {
                const buildingItem = document.createElement('div');
                buildingItem.className = 'building-item';
                buildingItem.dataset.buildingType = type;

                const header = document.createElement('div');
                header.className = 'building-header';
                header.innerHTML = `
                    <span class="building-type">${type}</span>
                    <span class="building-count">${buildings.length}个</span>
                    <button class="toggle-building">${currentExpanded.has(type) ? '折叠' : '展开'}</button>
                `;

                const content = document.createElement('div');
                content.className = 'building-content';
                content.style.display = currentExpanded.has(type) ? 'block' : 'none';

                buildings.forEach(building => {
                    const buildingEl = document.createElement('div');
                    buildingEl.className = 'building-detail';
                    buildingEl.innerHTML = `
                        <div class="building-info">
                            <span class="building-level">等级 ${building.当前等级}</span>
                            <span class="building-status">${building.可升级 ? '可升级' : '不可升级'}</span>
                        </div>
                        <div class="building-actions">
                            <button class="upgrade-btn" ${!building.可升级 ? 'disabled' : ''}>升级</button>
                            <button class="queue-btn" ${!building.可升级 ? 'disabled' : ''}>加入队列</button>
                        </div>
                    `;

                    // 添加升级按钮事件
                    const upgradeBtn = buildingEl.querySelector('.upgrade-btn');
                    upgradeBtn.addEventListener('click', () => {
                        if (building.可升级) {
                            window.location.href = building.建设链接;
                        }
                    });

                    // 添加加入队列按钮事件
                    const queueBtn = buildingEl.querySelector('.queue-btn');
                    queueBtn.addEventListener('click', () => {
                        if (building.可升级) {
                            window.TravianBuildingQueueManager.addToQueue({
                                建筑类型: type,
                                目标等级: building.当前等级 + 1,
                                建设链接: building.建设链接,
                                所需资源: building.升级所需资源
                            });
                        }
                    });

                    content.appendChild(buildingEl);
                });

                // 添加展开/折叠事件
                const toggleBtn = header.querySelector('.toggle-building');
                toggleBtn.addEventListener('click', () => {
                    const isExpanded = content.style.display === 'block';
                    content.style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.textContent = isExpanded ? '展开' : '折叠';
                    
                    // 更新展开状态记录
                    if (isExpanded) {
                        this.expandedBuildings.delete(type);
                    } else {
                        this.expandedBuildings.add(type);
                    }
                });

                buildingItem.appendChild(header);
                buildingItem.appendChild(content);
                buildingListContent.appendChild(buildingItem);
            });

            // 更新队列显示
            const queueContent = this.panel.querySelector('.queue-content');
            if (queueContent) {
                queueContent.innerHTML = buildingQueue.length === 0 ? 
                    '<div class="empty-queue">队列为空</div>' :
                    buildingQueue.map((building, index) => `
                        <div class="queue-item">
                            <span class="queue-index">${index + 1}</span>
                            <span class="queue-building">${building.建筑类型} → ${building.目标等级}级</span>
                            <button class="remove-btn" data-index="${index}">移除</button>
                        </div>
                    `).join('');

                // 重新绑定移除按钮事件
                queueContent.querySelectorAll('.remove-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const index = parseInt(btn.dataset.index);
                        window.TravianBuildingQueueManager.removeFromQueueByIndex(index);
                    });
                });
            }
        }
    },

    // 获取下一级升级所需资源
    getRequiredResourcesForNextUpgrade: function(type, currentLevel) {
        // 这里需要根据建筑类型和当前等级返回升级所需资源
        // 暂时返回一个示例值，后续可以根据游戏数据完善
        return {
            木材: 100 * (currentLevel + 1),
            粘土: 100 * (currentLevel + 1),
            铁: 100 * (currentLevel + 1),
            麦子: 100 * (currentLevel + 1)
        };
    },

    // ... rest of the code ...
};

// 导出为全局变量
window.TravianUIManager = UIManager; 