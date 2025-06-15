// ==UserScript==
// @name         Travian 游戏助手
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Travian 游戏助手，提供资源管理、建筑队列管理等功能
// @author       hupeng
// @match        https://*.travian.com/*
// @match        https://*.travian.com.*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      self
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 全局命名空间
    window.TravianCore = {
        // 版本信息
        version: '0.1.0',
        
        // 日志级别
        logLevel: 'debug', // 'debug', 'info', 'warn', 'error'
        
        // 日志函数
        log: function(message, level = 'info') {
            const levels = ['debug', 'info', 'warn', 'error'];
            const currentLevel = levels.indexOf(this.logLevel);
            const messageLevel = levels.indexOf(level);
            
            if (messageLevel >= currentLevel) {
                const timestamp = new Date().toLocaleTimeString();
                const prefix = `[${timestamp}]`;
                
                switch (level) {
                    case 'debug':
                        console.debug(prefix, message);
                        break;
                    case 'info':
                        console.info(prefix, message);
                        break;
                    case 'warn':
                        console.warn(prefix, message);
                        break;
                    case 'error':
                        console.error(prefix, message);
                        break;
                }
            }
        },
        
        // 模块管理
        modules: {},
        
        // 注册模块
        registerModule: function(name, module) {
            if (this.modules[name]) {
                this.log(`模块 ${name} 已存在，将被覆盖`, 'warn');
            }
            this.modules[name] = module;
            this.log(`模块 ${name} 已注册`);
        },
        
        // 初始化模块
        initModule: async function(name) {
            const module = this.modules[name];
            if (!module) {
                this.log(`模块 ${name} 不存在`, 'error');
                return false;
            }
            
            if (typeof module.init !== 'function') {
                this.log(`模块 ${name} 没有 init 方法`, 'error');
                return false;
            }
            
            try {
                const result = await module.init();
                if (result) {
                    this.log(`模块 ${name} 初始化成功`);
                } else {
                    this.log(`模块 ${name} 初始化失败`, 'error');
                }
                return result;
            } catch (error) {
                this.log(`模块 ${name} 初始化出错: ${error}`, 'error');
                return false;
            }
        },
        
        // 初始化所有模块
        initAllModules: async function() {
            this.log('开始初始化模块...');
            this.log('当前已注册的模块:', 'debug');
            console.debug(Object.keys(this.modules));
            
            for (const name in this.modules) {
                await this.initModule(name);
            }
        }
    };

    // 初始化应用
    async function initializeApp() {
        try {
            // 加载模块
            const moduleFiles = [
                'src/managers/ResourceManager.js',
                'src/managers/BuildingQueueManager.js',
                'src/managers/BuildingDetailManager.js',
                'src/managers/UIManager.js',
                'src/utils/GameUtils.js'
            ];
            
            // 动态加载模块
            for (const file of moduleFiles) {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(file);
                script.type = 'text/javascript';
                (document.head || document.documentElement).appendChild(script);
                await new Promise(resolve => script.onload = resolve);
            }
            
            // 初始化所有模块
            await window.TravianCore.initAllModules();
            
            window.TravianCore.log('Travian助手初始化完成');
        } catch (error) {
            window.TravianCore.log(`初始化失败: ${error}`, 'error');
        }
    }

    // 启动应用
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
})(); 