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
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '10px',
                    borderRadius: '5px',
                    color: 'white',
                    zIndex: '9999',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    minWidth: '200px'
                }
            });

            const title = window.TravianUtils.createElement('div', {
                style: {
                    borderBottom: '1px solid #666',
                    paddingBottom: '5px',
                    marginBottom: '5px',
                    fontWeight: 'bold'
                }
            }, ['资源状态']);

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

        let html = '<div style="display: grid; grid-template-columns: auto 1fr; gap: 5px;">';
        
        // 添加资源信息
        resourceTypes.forEach(type => {
            const stock = resources?.[type]?.库存 || 0;
            const production = resources?.[type]?.每小时产量 || 0;
            
            html += `
                <div style="grid-column: 1; text-align: right;">${resourceNames[type]}:</div>
                <div style="grid-column: 2;">
                    <span id="${type}Stock">${stock.toLocaleString()}</span>
                    (<span id="${type}Production" style="color: ${production >= 0 ? '#90EE90' : '#FFB6C1'}">${production > 0 ? '+' : ''}${production}/小时</span>)
                </div>
            `;
        });

        // 添加人口信息
        if (resources?.当前人口 !== undefined && resources?.最大人口 !== undefined) {
            html += `
                <div style="grid-column: 1; text-align: right;">人口:</div>
                <div style="grid-column: 2;" id="population">${resources.当前人口}/${resources.最大人口}</div>
            `;
        }

        // 添加建筑队列状态
        if (resources?.建筑队列状态 !== undefined) {
            html += `
                <div style="grid-column: 1; text-align: right;">建筑队列:</div>
                <div style="grid-column: 2;" id="buildingQueue">${resources.建筑队列状态}</div>
            `;
        }

        // 添加资源建筑等级
        if (resources?.资源建筑等级) {
            Object.entries(resources.资源建筑等级).forEach(([building, level]) => {
                html += `
                    <div style="grid-column: 1; text-align: right;">${building}:</div>
                    <div style="grid-column: 2;" id="${building}Level">等级 ${level}</div>
                `;
            });
        }

        html += '</div>';
        return html;
    }
};

// 导出为全局变量
window.TravianUIManager = UIManager; 