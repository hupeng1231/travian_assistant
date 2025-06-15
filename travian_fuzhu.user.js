// ==UserScript==
// @name         Travian Game Assistant
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Travian游戏助手
// @author       hupeng1231
// @match        https://*.travian.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/hupeng1231/travian_assistant/main/src/core/Core.js
// @require      https://raw.githubusercontent.com/hupeng1231/travian_assistant/main/src/utils/Utils.js
// @require      https://raw.githubusercontent.com/hupeng1231/travian_assistant/main/src/managers/ResourceManager.js
// @require      https://raw.githubusercontent.com/hupeng1231/travian_assistant/main/src/managers/BuildingQueueManager.js
// @require      https://raw.githubusercontent.com/hupeng1231/travian_assistant/main/src/managers/BuildingDetailManager.js
// @require      https://raw.githubusercontent.com/hupeng1231/travian_assistant/main/src/ui/UIManager.js
// ==/UserScript==

(function() {
    'use strict';

    // 检查模块是否已加载
    function checkModuleLoaded(moduleName) {
        const module = window[`Travian${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`];
        console.debug(`检查模块 ${moduleName}:`, module);
        return module && typeof module === 'object';
    }

    // 等待所有模块加载完成
    function waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 最多等待5秒

            const checkModules = () => {
                attempts++;
                const modules = {
                    Core: window.TravianCore,
                    Utils: window.TravianUtils,
                    ResourceManager: window.TravianResourceManager,
                    BuildingQueueManager: window.TravianBuildingQueueManager,
                    BuildingDetailManager: window.TravianBuildingDetailManager,
                    UIManager: window.TravianUIManager
                };

                const loadedModules = Object.entries(modules)
                    .filter(([name, module]) => module && typeof module === 'object')
                    .map(([name]) => name);

                console.debug(`模块加载检查 (尝试 ${attempts}/${maxAttempts}):`, {
                    loaded: loadedModules,
                    missing: Object.keys(modules).filter(name => !loadedModules.includes(name))
                });

                if (loadedModules.length === Object.keys(modules).length) {
                    console.log('所有模块已加载完成');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('模块加载超时，已加载的模块:', loadedModules);
                    resolve(); // 继续执行，但记录错误
                } else {
                    setTimeout(checkModules, 100);
                }
            };

            checkModules();
        });
    }

    // 初始化应用
    async function initializeApp() {
        try {
            console.log('开始初始化 Travian 助手...');

            // 等待所有模块加载完成
            await waitForModules();

            // 检查核心模块
            if (!window.TravianCore) {
                throw new Error('核心模块未加载');
            }

            // 注册所有模块
            const modules = {
                resource: window.TravianResourceManager,
                buildingQueue: window.TravianBuildingQueueManager,
                buildingDetail: window.TravianBuildingDetailManager,
                ui: window.TravianUIManager,
                utils: window.TravianUtils
            };

            console.log('准备注册模块:', Object.keys(modules));

            // 按顺序注册模块
            for (const [name, module] of Object.entries(modules)) {
                if (module) {
                    console.debug(`注册模块 ${name}:`, module);
                    const success = window.TravianCore.registerModule(name, module);
                    if (!success) {
                        console.error(`模块 ${name} 注册失败`);
                    }
                } else {
                    console.error(`模块 ${name} 未找到`);
                }
            }

            // 初始化应用
            window.TravianCore.init();
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    // 启动应用
    initializeApp();
})(); 