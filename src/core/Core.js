// Core.js - 核心模块
const Core = {
    version: '0.1',
    debug: true,
    // 预定义的模块名称列表
    validModuleNames: ['resource', 'buildingQueue', 'buildingDetail', 'ui', 'utils'],
    modules: {
        resource: null,
        buildingQueue: null,
        buildingDetail: null,
        ui: null,
        utils: null
    },

    init: function() {
        this.log('开始初始化模块...');
        this.log('当前已注册的模块:', Object.keys(this.modules).filter(key => this.modules[key] !== null));
        
        // 初始化所有已注册的模块
        Object.entries(this.modules).forEach(([name, module]) => {
            if (module && typeof module.init === 'function') {
                try {
                    module.init();
                    this.log(`模块 ${name} 初始化成功`);
                } catch (error) {
                    this.log(`模块 ${name} 初始化失败: ${error.message}`, 'error');
                }
            } else if (module === null) {
                this.log(`模块 ${name} 未注册`, 'warn');
            }
        });

        this.log('Travian助手初始化完成');
    },

    registerModule: function(name, module) {
        this.log(`尝试注册模块: ${name}`, 'debug');
        this.log(`模块对象:`, module, 'debug');
        
        // 检查模块名称是否有效
        if (!this.validModuleNames.includes(name)) {
            this.log(`未知模块名称: ${name}`, 'error');
            this.log('可用的模块名称:', this.validModuleNames, 'debug');
            return false;
        }

        // 检查模块对象是否有效
        if (!module || typeof module !== 'object') {
            this.log(`无效的模块对象: ${name}`, 'error');
            return false;
        }

        // 检查模块是否已经注册
        if (this.modules[name] !== null) {
            this.log(`模块 ${name} 已经注册，将被覆盖`, 'warn');
        }

        // 注册模块
        this.modules[name] = module;
        this.log(`模块 ${name} 已注册`);

        // 如果模块有 init 方法，立即初始化
        if (typeof module.init === 'function') {
            try {
                module.init();
                this.log(`模块 ${name} 初始化成功`);
            } catch (error) {
                this.log(`模块 ${name} 初始化失败: ${error.message}`, 'error');
            }
        }

        return true;
    },

    log: function(message, type = 'info', data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        if (this.debug || type === 'error' || type === 'warn') {
            switch(type) {
                case 'error':
                    console.error(logMessage);
                    if (data) console.error(data);
                    break;
                case 'warn':
                    console.warn(logMessage);
                    if (data) console.warn(data);
                    break;
                case 'debug':
                    if (this.debug) {
                        console.debug(logMessage);
                        if (data) console.debug(data);
                    }
                    break;
                default:
                    console.log(logMessage);
                    if (data) console.log(data);
            }
        }
    }
};

// 导出为全局变量
window.TravianCore = Core; 