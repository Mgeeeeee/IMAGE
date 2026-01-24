/* ======================================================================
 * [INPUT]: 用户输入、预设文本、参考图、API 配置
 * [OUTPUT]: generate/regenerate 生图流程
 * [POS]: 生成流程编排模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-24
 * ====================================================================== */
(function () {
    function createGeneration(options) {
        const normalizePromptText = options.normalizePromptText || (text => (text || '').trim());
        const imageApi = options.imageApi;
        const ui = options.ui;
        const getReferenceImageBase64 = options.getReferenceImageBase64 || (() => null);
        const onSuccess = options.onSuccess || (() => {});
        const presetData = options.presetData || {};

        let lastGenerationConfig = null;

        function getCurrentGenerationConfig() {
            const apiKey = document.getElementById('apiKey').value.trim();
            const apiUrl = document.getElementById('apiUrl').value.trim();
            const model = document.getElementById('modelSelect').value;
            const activePreset = document.querySelector('.preset-chip.active');
            const stylePrompt = normalizePromptText(activePreset ? presetData[activePreset.textContent] || '' : '');
            const tempPrompt = normalizePromptText(document.getElementById('tempPromptInput').value);
            const size = document.getElementById('sizeSelect').value;
            const fullPrompt = normalizePromptText([tempPrompt, stylePrompt].filter(p => p).join(', '));
            return {
                apiKey,
                apiUrl,
                model,
                stylePrompt,
                tempPrompt,
                fullPrompt,
                size,
                referenceImageBase64: getReferenceImageBase64()
            };
        }

        async function generate(configOverride) {
            const config = configOverride || getCurrentGenerationConfig();
            const apiKey = config.apiKey || '';
            const apiUrl = config.apiUrl || '';
            const model = config.model || '';
            const stylePrompt = normalizePromptText(config.stylePrompt || '');
            const tempPrompt = normalizePromptText(config.tempPrompt || '');
            const size = config.size || '';
            const fullPrompt = normalizePromptText(config.fullPrompt || [tempPrompt, stylePrompt].filter(p => p).join(', '));
            const refImage = config.referenceImageBase64;

            if (!apiKey) return ui.showError('请先配置 API Key');
            if (!tempPrompt && !stylePrompt) return ui.showError('请输入创作灵感');
            if (!imageApi) return ui.showError('图片生成模块未加载');

            lastGenerationConfig = {
                apiKey,
                apiUrl,
                model,
                stylePrompt,
                tempPrompt,
                fullPrompt,
                size,
                referenceImageBase64: refImage
            };

            const btn = document.getElementById('sendBtn');
            const preview = document.getElementById('mainPreview');

            btn.disabled = true;
            ui.updateActionButtonState({ revealing: false, generating: true, hidden: true });
            ui.hideActionTools();
            preview.style.display = 'none';
            ui.hideEmptyState();
            ui.startLoadingParticles(size);

            try {
                const request = imageApi.buildImageRequest({
                    apiUrl,
                    apiKey,
                    model,
                    size,
                    fullPrompt,
                    refImage
                });

                console.log(`[Router] Model: ${model}, AspectRatio: ${size}, Protocol: ${request.protocol}`);

                const res = await fetch(request.url, request.options);

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error?.message || '请求失败，请检查 API 权限');
                }

                const data = await res.json();
                const url = imageApi.parseImageResponse(data);

                if (url) {
                    ui.displayPreview(url);
                    onSuccess();
                    return { ok: true };
                }
                throw new Error('未能从响应中提取到图片地址');
            } catch (e) {
                ui.showError(e.message);
                ui.stopLoadingParticles(true);
                ui.updateActionButtonState({ hidden: false });
                ui.showEmptyState();
                return { ok: false, error: e };
            } finally {
                btn.disabled = false;
                ui.updateActionButtonState({ generating: false });
            }
        }

        function regenerate() {
            if (!lastGenerationConfig) {
                ui.showError('暂无可重新生成的内容');
                return { ok: false };
            }
            generate(lastGenerationConfig);
            return { ok: true };
        }

        return {
            generate,
            regenerate,
            getLastConfig: () => lastGenerationConfig
        };
    }

    window.generation = {
        create: createGeneration
    };
})();
