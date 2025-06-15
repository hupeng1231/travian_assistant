// Core.js - 核心模块
const Core = {
    version: '0.1',
    debug: true,
    modules: {
        resource: null,
        buildingQueue: null,
        buildingDetail: null,
        ui: null,
        utils: null
    },

    init: function() {
        // 初始化所有已注册的模块
        Object.entries(this.modules).forEach(([name, module]) => {
            if (module && typeof module.init === 'function') {
                try {
                    module.init();
                    this.log(`模块 ${name} 初始化成功`);
                } catch (error) {
                    this.log(`模块 ${name} 初始化失败: ${error.message}`, 'error');
                }
            }
        });

        this.log('Travian助手初始化完成');
    },

    registerModule: function(name, module) {
        if (this.modules.hasOwnProperty(name)) {
            this.modules[name] = module;
            this.log(`模块 ${name} 已注册`);
            
            // 如果模块有 init 方法，立即初始化
            if (module && typeof module.init === 'function') {
                try {
                    module.init();
                    this.log(`模块 ${name} 初始化成功`);
                } catch (error) {
                    this.log(`模块 ${name} 初始化失败: ${error.message}`, 'error');
                }
            }
        } else {
            this.log(`未知模块名称: ${name}`, 'error');
        }
    },

    log: function(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        switch(type) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }
};

// 导出为全局变量
window.TravianCore = Core; 