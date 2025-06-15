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

    // 等待所有模块加载完成
    function waitForModules() {
        return new Promise((resolve) => {
            const checkModules = () => {
                if (window.TravianCore && 
                    window.TravianUtils && 
                    window.TravianResourceManager && 
                    window.TravianBuildingQueueManager && 
                    window.TravianBuildingDetailManager && 
                    window.TravianUIManager) {
                    resolve();
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
            // 等待所有模块加载完成
            await waitForModules();

            // 注册所有模块
            const modules = {
                resource: window.TravianResourceManager,
                buildingQueue: window.TravianBuildingQueueManager,
                buildingDetail: window.TravianBuildingDetailManager,
                ui: window.TravianUIManager,
                utils: window.TravianUtils
            };

            // 按顺序注册模块
            for (const [name, module] of Object.entries(modules)) {
                if (module) {
                    window.TravianCore.registerModule(name, module);
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