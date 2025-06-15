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

    // 注册所有模块
    window.TravianCore.registerModule('resource', window.TravianResourceManager);
    window.TravianCore.registerModule('buildingQueue', window.TravianBuildingQueueManager);
    window.TravianCore.registerModule('buildingDetail', window.TravianBuildingDetailManager);
    window.TravianCore.registerModule('ui', window.TravianUIManager);
    window.TravianCore.registerModule('utils', window.TravianUtils);

    // 初始化应用
    window.TravianCore.init();
})(); 