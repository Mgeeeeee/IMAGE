/* ======================================================================
 * [INPUT]: 浏览器文本输入、预设文本
 * [OUTPUT]: normalizePromptText 文本清理方法
 * [POS]: 生成前提示词清洗工具
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-24
 * ====================================================================== */
(function () {
    function normalizePromptText(text) {
        if (!text) return '';
        const normalized = String(text)
            .replace(/\r\n?/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\u00A0/g, ' ')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .join('\n');
        return normalized.replace(/[ \t]+/g, ' ').trim();
    }

    window.promptUtils = {
        normalizePromptText
    };
})();
