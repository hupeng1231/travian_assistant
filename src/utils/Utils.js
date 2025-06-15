// Utils.js - 工具函数模块
const Utils = {
    formatTimeDisplay: function(hours) {
        if (hours < 1) {
            const minutes = Math.ceil(hours * 60);
            return `${minutes}分钟`;
        }
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        return minutes > 0 ? `${wholeHours}小时${minutes}分钟` : `${wholeHours}小时`;
    },

    calculateResourceAccumulationTime: function(currentResources, requiredResources, productionRates) {
        let maxWaitTime = 0;
        const missingResources = [];

        for (const [resource, required] of Object.entries(requiredResources)) {
            const current = currentResources[resource]?.库存 || 0;
            const production = productionRates[resource] || 0;

            if (current < required) {
                const missing = required - current;
                if (production <= 0) {
                    window.TravianCore.log(`资源 ${resource} 产量为0或负数，无法计算等待时间`, 'warn');
                    return { 最大等待时间: 24, missingResources: [resource] };
                }

                const waitTime = missing / production;
                maxWaitTime = Math.max(maxWaitTime, waitTime);
                missingResources.push(resource);
            }
        }

        return {
            最大等待时间: maxWaitTime,
            missingResources
        };
    },

    calculateStorageFullTime: function(currentStock, capacity, hourlyProduction) {
        if (hourlyProduction <= 0) {
            return Infinity;
        }
        const remainingSpace = capacity - currentStock;
        return remainingSpace / hourlyProduction;
    },

    safeUpdateElement: function(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    createElement: function(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // 设置属性
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // 添加子元素
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    },

    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: function(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// 导出为全局变量
window.TravianUtils = Utils; 