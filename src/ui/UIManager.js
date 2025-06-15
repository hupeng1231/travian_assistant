// UIManager.js - UI管理模块
const UIManager = {
    init: function() {
        window.TravianCore.log('开始初始化 UI 模块...', 'debug');
        // 在所有页面都创建资源面板
        this.createResourcePanel();
        window.TravianCore.log('UI管理模块初始化完成');
    },

    createResourcePanel: function() {
        window.TravianCore.log('开始创建资源面板...', 'debug');
        
        const existingPanel = document.getElementById('resourcePanel');
        if (existingPanel) {
            window.TravianCore.log('移除已存在的资源面板', 'debug');
            existingPanel.remove();
        }

        try {
            const panel = window.TravianUtils.createElement('div', {
                id: 'resourcePanel',
                className: 'resourcePanel',
                style: {
                    position: 'fixed',
                    top: '50%',
                    left: '10px',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '10px',
                    borderRadius: '5px',
                    color: 'white',
                    zIndex: '9999',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    minWidth: '200px',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }
            });

            const title = window.TravianUtils.createElement('div', {
                style: {
                    borderBottom: '1px solid #666',
                    paddingBottom: '5px',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }
            }, ['游戏助手']);

            const content = window.TravianUtils.createElement('div', {
                id: 'resourcePanelContent'
            });

            panel.appendChild(title);
            panel.appendChild(content);
            document.body.appendChild(panel);

            window.TravianCore.log('资源面板创建成功', 'debug');
            window.TravianCore.log('面板元素:', panel, 'debug');

            this.updateResourcePanel();
            setInterval(() => this.updateResourcePanel(), 5000);
        } catch (error) {
            window.TravianCore.log(`创建资源面板时出错: ${error.message}`, 'error');
        }
    },

    updateResourcePanel: function() {
        const resources = window.TravianResourceManager.getCurrentResources();
        const content = document.getElementById('resourcePanelContent');
        if (!content) {
            window.TravianCore.log('未找到资源面板内容元素', 'warn');
            return;
        }

        const safeUpdateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                window.TravianCore.log(`未找到元素: ${id}`, 'warn');
            }
        };

        // 创建资源面板HTML
        const html = this.createResourcePanelHTML(resources);
        content.innerHTML = html;

        // 更新资源信息
        if (resources) {
            const resourceTypes = ['wood', 'clay', 'iron', 'crop'];
            const resourceNames = {
                wood: '木材',
                clay: '泥土',
                iron: '铁矿',
                crop: '粮食'
            };

            resourceTypes.forEach(type => {
                const stock = resources[type]?.库存 || 0;
                const production = resources[type]?.每小时产量 || 0;
                const stockElement = document.getElementById(`${type}Stock`);
                const productionElement = document.getElementById(`${type}Production`);

                if (stockElement) stockElement.textContent = stock.toLocaleString();
                if (productionElement) productionElement.textContent = `${production > 0 ? '+' : ''}${production}/小时`;
            });

            // 更新人口信息
            if (resources.当前人口 !== undefined && resources.最大人口 !== undefined) {
                const populationElement = document.getElementById('population');
                if (populationElement) {
                    populationElement.textContent = `${resources.当前人口}/${resources.最大人口}`;
                }
            }

            // 更新建筑队列状态
            if (resources.建筑队列状态 !== undefined) {
                const queueElement = document.getElementById('buildingQueue');
                if (queueElement) {
                    queueElement.textContent = resources.建筑队列状态;
                }
            }

            // 更新资源建筑等级
            if (resources.资源建筑等级) {
                Object.entries(resources.资源建筑等级).forEach(([building, level]) => {
                    const levelElement = document.getElementById(`${building}Level`);
                    if (levelElement) {
                        levelElement.textContent = `等级 ${level}`;
                    }
                });
            }
        }
    },

    createResourcePanelHTML: function(resources) {
        const resourceTypes = ['wood', 'clay', 'iron', 'crop'];
        const resourceNames = {
            wood: '木材',
            clay: '泥土',
            iron: '铁矿',
            crop: '粮食'
        };

        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        
        // 添加资源信息
        html += '<div style="border-bottom: 1px solid #666; padding-bottom: 5px;">';
        html += '<div style="font-weight: bold; margin-bottom: 5px;">资源状态</div>';
        resourceTypes.forEach(type => {
            const stock = resources?.[type]?.库存 || 0;
            const production = resources?.[type]?.每小时产量 || 0;
            const capacity = resources?.[type]?.容量 || 0;
            
            html += `
                <div style="margin: 3px 0;">
                    <span style="color: #aaa;">${resourceNames[type]}:</span>
                    <span style="float: right;">
                        ${stock.toLocaleString()}/${capacity.toLocaleString()}
                        (<span style="color: ${production >= 0 ? '#90EE90' : '#FFB6C1'}">${production > 0 ? '+' : ''}${production}/h</span>)
                    </span>
                </div>
            `;
        });
        html += '</div>';

        // 添加人口信息
        if (resources?.当前人口 !== undefined && resources?.最大人口 !== undefined) {
            html += `
                <div style="border-bottom: 1px solid #666; padding-bottom: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">人口</div>
                    <div>当前: ${resources.当前人口}/${resources.最大人口}</div>
                </div>
            `;
        }

        // 添加建筑队列状态
        const buildingQueue = window.TravianCore.modules.buildingQueue;
        const currentBuilding = buildingQueue?.currentQueue[0];
        if (currentBuilding) {
            html += `
                <div style="border-bottom: 1px solid #666; padding-bottom: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">当前建筑</div>
                    <div>${currentBuilding.建筑名称} → 等级 ${currentBuilding.目标等级}</div>
                    <div style="margin-top: 5px; font-weight: bold;">所需资源:</div>
            `;

            if (currentBuilding.所需资源) {
                for (const [type, amount] of Object.entries(currentBuilding.所需资源)) {
                    const current = resources[type]?.库存 || 0;
                    const missing = Math.max(0, amount - current);
                    const production = resources[type]?.每小时产量 || 0;
                    const waitTime = production > 0 ? missing / production : 0;
                    const waitTimeText = window.TravianUtils.formatTimeDisplay(waitTime);

                    html += `
                        <div style="margin: 3px 0;">
                            <span style="color: #aaa;">${resourceNames[type]}:</span>
                            <span style="float: right;">
                                ${current}/${amount}
                                ${missing > 0 ? ` (缺: ${missing}, 等: ${waitTimeText})` : ''}
                            </span>
                        </div>
                    `;
                }
            }
            html += '</div>';
        }

        // 添加资源建筑等级
        if (resources?.资源建筑等级) {
            html += `
                <div style="border-bottom: 1px solid #666; padding-bottom: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">资源建筑</div>
            `;
            Object.entries(resources.资源建筑等级).forEach(([building, level]) => {
                html += `
                    <div style="margin: 3px 0;">
                        <span style="color: #aaa;">${building}:</span>
                        <span style="float: right;">等级 ${level}</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }
};

// 导出为全局变量
window.TravianUIManager = UIManager; 