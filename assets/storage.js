/* ======================================================================
 * [INPUT]: localStorage 键值
 * [OUTPUT]: readConfig/writeConfig 与存取方法
 * [POS]: 本地缓存读写入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-24
 * ====================================================================== */
(function () {
    const STORAGE_KEYS = {
        apiKey: 'apiKey',
        apiUrl: 'apiUrl',
        model: 'model',
        size: 'size',
        vip: 'vip'
    };

    function readConfig() {
        return {
            apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || '',
            apiUrl: localStorage.getItem(STORAGE_KEYS.apiUrl) || '',
            model: localStorage.getItem(STORAGE_KEYS.model) || '',
            size: localStorage.getItem(STORAGE_KEYS.size) || '',
            vipEnabled: localStorage.getItem(STORAGE_KEYS.vip) === '1'
        };
    }

    function setApiKey(value) {
        localStorage.setItem(STORAGE_KEYS.apiKey, value || '');
    }

    function setApiUrl(value) {
        localStorage.setItem(STORAGE_KEYS.apiUrl, value || '');
    }

    function setModel(value) {
        localStorage.setItem(STORAGE_KEYS.model, value || '');
    }

    function setSize(value) {
        localStorage.setItem(STORAGE_KEYS.size, value || '');
    }

    function setVipEnabled(enabled) {
        localStorage.setItem(STORAGE_KEYS.vip, enabled ? '1' : '0');
    }

    function getVipEnabled() {
        return localStorage.getItem(STORAGE_KEYS.vip) === '1';
    }

    function writeConfig(next) {
        if (!next) return;
        if (Object.prototype.hasOwnProperty.call(next, 'apiKey')) setApiKey(next.apiKey);
        if (Object.prototype.hasOwnProperty.call(next, 'apiUrl')) setApiUrl(next.apiUrl);
        if (Object.prototype.hasOwnProperty.call(next, 'model')) setModel(next.model);
        if (Object.prototype.hasOwnProperty.call(next, 'size')) setSize(next.size);
        if (Object.prototype.hasOwnProperty.call(next, 'vipEnabled')) setVipEnabled(next.vipEnabled);
    }

    window.storage = {
        readConfig,
        writeConfig,
        setApiKey,
        setApiUrl,
        setModel,
        setSize,
        setVipEnabled,
        getVipEnabled
    };
})();
