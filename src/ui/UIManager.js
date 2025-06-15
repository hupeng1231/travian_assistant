// UIManager.js - UI管理模块
const UIManager = {
    init: function() {
        // 在所有页面都创建资源面板
        this.createResourcePanel();
        window.TravianCore.log('UI管理模块初始化完成');
    },

    createResourcePanel: function() {
        const existingPanel = document.getElementById('resourcePanel');
        if (existingPanel) {
            existingPanel.remove();
        }

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

        this.updateResourcePanel();
        setInterval(() => this.updateResourcePanel(), 5000);
    },

    updateResourcePanel: function() {
        const content = document.getElementById('resourcePanelContent');
        if (!content) return;

        const resources = window.TravianResourceManager.getCurrentResources();
        const productionRates = window.TravianResourceManager.getProductionRates();
        const buildingQueue = window.TravianCore.modules.buildingQueue;
        const currentBuilding = buildingQueue?.currentQueue[0];

        let html = '';
        for (const [type, info] of Object.entries(resources)) {
            const production = productionRates[type] || 0;
            const productionText = production >= 0 ? `+${production}` : production;
            html += `
                <div style="margin: 5px 0;">
                    <span style="color: #aaa;">${this.getResourceName(type)}:</span>
                    <span style="float: right;">${info.库存} (${productionText}/h)</span>
                </div>
            `;
        }

        if (currentBuilding) {
            const required = currentBuilding.所需资源;
            if (required) {
                html += '<div style="margin-top: 10px; border-top: 1px solid #666; padding-top: 5px;">';
                html += '<div style="color: #aaa; margin-bottom: 5px;">升级所需资源:</div>';
                for (const [type, amount] of Object.entries(required)) {
                    const current = resources[type]?.库存 || 0;
                    const missing = Math.max(0, amount - current);
                    const production = productionRates[type] || 0;
                    const waitTime = production > 0 ? missing / production : 0;
                    const waitTimeText = window.TravianUtils.formatTimeDisplay(waitTime);

                    html += `
                        <div style="margin: 3px 0;">
                            <span style="color: #aaa;">${this.getResourceName(type)}:</span>
                            <span style="float: right;">
                                ${current}/${amount}
                                ${missing > 0 ? ` (缺少: ${missing}, 等待: ${waitTimeText})` : ''}
                            </span>
                        </div>
                    `;
                }
                html += '</div>';
            }
        }

        content.innerHTML = html;
    },

    getResourceName: function(type) {
        const names = {
            wood: '木材',
            clay: '粘土',
            iron: '铁矿',
            crop: '粮食'
        };
        return names[type] || type;
    }
};

// 导出为全局变量
window.TravianUIManager = UIManager; 