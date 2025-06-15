// UIManager.js - UI管理模块
const UIManager = {
    init: function() {
        window.TravianCore.log('开始初始化 UI 模块...', 'debug');
        this.createResourcePanel();
        window.TravianCore.log('UI管理模块初始化完成');
    },

    createResourcePanel: function() {
        window.TravianCore.log('开始创建资源面板...', 'debug');
        
        const existingPanel = document.getElementById('travian-assistant-panel');
        if (existingPanel) {
            window.TravianCore.log('移除已存在的资源面板', 'debug');
            existingPanel.remove();
        }

        try {
            const panel = window.TravianUtils.createElement('div', {
                id: 'travian-assistant-panel',
                style: {
                    position: 'fixed',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '250px',
                    maxHeight: '500px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '10px',
                    zIndex: '9999',
                    borderRadius: '10px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                    overflowY: 'auto'
                }
            });

            panel.innerHTML = this.createResourcePanelHTML();
            document.body.appendChild(panel);

            // 添加事件监听
            this.setupPanelEvents();

            window.TravianCore.log('资源面板创建成功', 'debug');
            window.TravianCore.log('面板元素:', panel, 'debug');

            this.updateResourcePanel();
            setInterval(() => this.updateResourcePanel(), 5000);
        } catch (error) {
            window.TravianCore.log(`创建资源面板时出错: ${error.message}`, 'error');
        }
    },

    setupPanelEvents: function() {
        // 开始队列按钮
        const startQueueBtn = document.getElementById('start-queue');
        if (startQueueBtn) {
            startQueueBtn.addEventListener('click', () => {
                window.TravianBuildingQueueManager.startQueueExecution();
                startQueueBtn.style.display = 'none';
                document.getElementById('stop-queue').style.display = 'inline-block';
            });
        }

        // 停止队列按钮
        const stopQueueBtn = document.getElementById('stop-queue');
        if (stopQueueBtn) {
            stopQueueBtn.addEventListener('click', () => {
                window.TravianBuildingQueueManager.stopQueueExecution();
                stopQueueBtn.style.display = 'none';
                document.getElementById('start-queue').style.display = 'inline-block';
            });
        }

        // 清空队列按钮
        const clearQueueBtn = document.getElementById('clear-queue');
        if (clearQueueBtn) {
            clearQueueBtn.addEventListener('click', () => {
                window.TravianBuildingQueueManager.clearQueue();
                this.updateResourcePanel();
            });
        }
    },

    updateResourcePanel: function() {
        const resources = window.TravianResourceManager.getCurrentResources();
        const additionalInfo = window.TravianResourceManager.collectAdditionalGameInfo();

        // 更新玩家信息
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

        // 更新建筑队列
        this.updateBuildingQueue();

        // 更新资源建筑管理
        this.updateResourceBuildings();
    },

    updateBuildingQueue: function() {
        const queueList = document.getElementById('building-queue-list');
        if (!queueList) return;

        const queue = window.TravianBuildingQueueManager.getCurrentQueue();
        queueList.innerHTML = queue.map((building, index) => `
            <div style="
                background-color: rgba(255,255,255,0.05);
                padding: 5px;
                margin-bottom: 5px;
                border-radius: 3px;
                font-size: 12px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${building.建筑类型} → 等级 ${building.目标等级}</span>
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
                window.TravianBuildingQueueManager.removeFromQueueByIndex(index);
                this.updateResourcePanel();
            });
        });
    },

    updateResourceBuildings: function() {
        const container = document.getElementById('building-types-container');
        if (!container) return;

        const resourceBuildings = window.TravianResourceManager.getResourceBuildings();
        container.innerHTML = '';

        // 遍历资源建筑类型
        for (const [type, buildings] of Object.entries(resourceBuildings)) {
            if (buildings.length === 0) continue;

            const typeContainer = window.TravianUtils.createElement('div', {
                style: {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '5px'
                }
            });

            const typeHeader = window.TravianUtils.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                }
            }, [`${type} (${buildings.length})`, '▼']);

            const buildingList = window.TravianUtils.createElement('div', {
                style: {
                    padding: '5px',
                    fontSize: '12px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    display: 'none'
                }
            });

            buildings.forEach(building => {
                const buildingItem = window.TravianUtils.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px',
                        padding: '3px',
                        borderRadius: '2px',
                        transition: 'background-color 0.2s'
                    }
                });

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
                    const buildingInfo = {
                        建筑类型: type,
                        地块ID: building.地块ID,
                        当前等级: building.当前等级,
                        目标等级: building.当前等级 + 1,
                        所需资源: building.升级所需资源,
                        建设链接: building.建设链接
                    };

                    window.TravianBuildingQueueManager.addToQueue(buildingInfo);
                    addToQueueButton.disabled = true;
                    addToQueueButton.textContent = '已在队列';
                    addToQueueButton.style.backgroundColor = '#888';
                });

                buildingList.appendChild(buildingItem);
            });

            // 切换展开/折叠
            typeHeader.addEventListener('click', () => {
                const isHidden = buildingList.style.display === 'none';
                buildingList.style.display = isHidden ? 'block' : 'none';
                typeHeader.lastChild.textContent = isHidden ? '▲' : '▼';
            });

            typeContainer.appendChild(typeHeader);
            typeContainer.appendChild(buildingList);
            container.appendChild(typeContainer);
        }
    },

    createResourcePanelHTML: function() {
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
};

// 导出为全局变量
window.TravianUIManager = UIManager; 