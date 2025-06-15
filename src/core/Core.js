// Core.js - 核心模块
const Core = {
    version: '0.1',
    debug: true,
    modules: {},

    init: function() {
        this.registerModules();
        this.initializeModules();
        this.log('Travian助手初始化完成');
    },

    registerModules: function() {
        this.modules = {
            resource: null, // 将在初始化时注入
            buildingQueue: null,
            buildingDetail: null,
            ui: null,
            utils: null
        };
    },

    initializeModules: function() {
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.init === 'function') {
                module.init();
            }
        });
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
    },

    // 模块注册方法
    registerModule: function(name, module) {
        if (this.modules.hasOwnProperty(name)) {
            this.modules[name] = module;
            this.log(`模块 ${name} 已注册`);
        } else {
            this.log(`未知模块名称: ${name}`, 'error');
        }
    }
};

// 导出为全局变量
window.TravianCore = Core; 