/* ======================================================================
 * [INPUT]: 页面交互与业务逻辑
 * [OUTPUT]: UI 事件与生成流程
 * [POS]: 全局脚本入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-24
 * ====================================================================== */
        let availableModels = [];
        let referenceImageBase64 = null;
        let lastGenerationConfig = null;
        let lastGeneratedImageUrl = '';
        let referenceImageRatio = null;
        const VIP_SUFFIX = '-vip';
        const QUICK_MODELS = {
            'nano-banana': 'btn-banana',
            'nano-banana-2': 'btn-banana-pro'
        };
        const ACTION_BUTTON_CLASSES = ['hidden', 'revealing', 'generating'];
        const normalizePromptText = window.promptUtils?.normalizePromptText || (text => (text || '').trim());
        const storage = window.storage;
        const ui = window.uiState?.create({
            actionButtonClasses: ACTION_BUTTON_CLASSES,
            getLastGeneratedImageUrl: () => lastGeneratedImageUrl,
            setLastGeneratedImageUrl: (url) => {
                lastGeneratedImageUrl = url;
            },
            getReferenceImageRatio: () => referenceImageRatio,
            getReferenceImageBase64: () => referenceImageBase64
        });

        if (!storage) {
            throw new Error('存储模块未加载');
        }
        if (!ui) {
            throw new Error('UI 状态模块未加载');
        }

        const {
            updateActionButtonState,
            showActionTools,
            hideActionTools,
            showEmptyState,
            hideEmptyState,
            showError,
            expandActionCenter,
            collapseActionCenter,
            switchTab,
            displayPreview,
            initLoadingVisuals,
            startLoadingParticles,
            stopLoadingParticles,
            resetLoadingVisuals
        } = ui;

        window.expandActionCenter = expandActionCenter;
        window.collapseActionCenter = collapseActionCenter;
        window.switchTab = switchTab;

        const presetData = {
            '浮墨': `# 浮墨
根据用户要求，结合语境氛围，生成图片

## 图片要求
- 纹理：宣纸、金箔
- 元素：东方、意象
- 结构：疏密、有致
- 排版：呼吸、留白

## 三申五令
- 禁止文字符号

## 输出
- 直接生成图片，不要多余解释.`,
            '流线': `# 流线
直接根据以下要求生成插画，不要提问，不要解释

## 具体任务
- 自动理解提炼材料主体
- 创作一副极简风格插画

## 插画风格
- 背景：干净、米色(#F1EBDE)
- 线条：流畅、克制、连续
- 颜色：黑色为主、克制的点缀色
- 整体：故事、交互、氛围、自然

## 三申五令
- 禁止文字符号

## 输出
- 请直接输出符合要求的图片，不要多余解释.`,
            '线条': `# 线条
直接根据以下要求为照片添加线条插画，不要提问，不要解释

## 视觉风格
- 线条：白色/黑色、简约、干净
- 主体：线条构成人物/动物/植物/日常物品
- 比例：主体的比例与透视需与照片场景匹配
- 融入：主体与照片场景自然有效互动，仿佛原本就存在
- 整体：主体与照片相辅相成，形成一个场景故事
- 想象：主体与照片的融合需出人意料 but 合乎情理，富有想象力

## 三申五令
- 禁止对原图片进行修改，只添加线条插画
- 禁止任何填充颜色，仅使用线条表现形体

## 输出
- 直接输出编辑后的图片，不要多余解释.`
        };

        function initPresets() {
            const container = document.getElementById('presetContainer');
            Object.keys(presetData).forEach(name => {
                const chip = document.createElement('div');
                chip.className = 'preset-chip';
                chip.textContent = name;
                chip.onclick = () => selectPreset(name, chip);
                container.appendChild(chip);
            });
        }

        function selectPreset(name, chipElement) {
            const wasActive = chipElement.classList.contains('active');
            document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
            if (!wasActive) chipElement.classList.add('active');
        }

        function autoResizeTextarea(element) {
            element.style.height = 'auto';
            element.style.height = element.scrollHeight + 'px';
        }

        function isVipEnabled() {
            return storage.getVipEnabled();
        }

        function setVipEnabled(enabled) {
            storage.setVipEnabled(enabled);
            const btn = document.getElementById('btn-vip');
            if (btn) btn.classList.toggle('active', enabled);
        }

        function getBaseModel(modelId) {
            if (!modelId) return '';
            return modelId.endsWith(VIP_SUFFIX) ? modelId.slice(0, -VIP_SUFFIX.length) : modelId;
        }

        function resolveVipModel(baseModelId) {
            if (!baseModelId) return baseModelId;
            if (baseModelId.endsWith(VIP_SUFFIX)) return baseModelId;
            return isVipEnabled() ? `${baseModelId}${VIP_SUFFIX}` : baseModelId;
        }

        function syncQuickModelButtons(modelId) {
            document.querySelectorAll('[data-role="quick-model"]').forEach(btn => btn.classList.remove('active'));
            const baseModel = getBaseModel(modelId);
            const btnId = QUICK_MODELS[baseModel];
            if (btnId) {
                const target = document.getElementById(btnId);
                if (target) target.classList.add('active');
            }
        }

        function selectQuickModel(baseModelId) {
            const select = document.getElementById('modelSelect');
            const modelId = resolveVipModel(baseModelId);

            // 设置模型值
            if (select) select.value = modelId;
            // 如果下拉列表里没有这个值（还没加载），直接写入缓存也会生效
            storage.setModel(modelId);

            // 按钮高亮逻辑
            syncQuickModelButtons(modelId);
            handleConfigChange();
        }

        function toggleVip() {
            const next = !isVipEnabled();
            setVipEnabled(next);

            const currentModel = document.getElementById('modelSelect').value;
            const baseModel = getBaseModel(currentModel);
            if (QUICK_MODELS[baseModel]) {
                selectQuickModel(baseModel);
                return;
            }
            handleConfigChange();
        }

        window.selectQuickModel = selectQuickModel;
        window.toggleVip = toggleVip;

        let accountBalance = null;
        let rawQuota = null;
        let balanceFetched = false;

        // --- 动态背景逻辑 ---
        const canvas = document.getElementById('bgCanvas');
        const ctx = canvas.getContext('2d');
        let particles = [];

        function initBackground() {
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            createParticles();
            animateBackground();
        }

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function createParticles() {
            particles = [];
            const count = Math.floor((canvas.width * canvas.height) / 25000);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1
                });
            }
        }

        function animateBackground() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 绘制连线和点 - 改为深灰色/黑色透明
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 150) {
                        ctx.lineWidth = (1 - dist / 150) * 1;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(animateBackground);
        }

        // --- 应用逻辑 ---
        window.addEventListener('DOMContentLoaded', () => {
            initBackground();
            initPresets();
            initLoadingVisuals();

            const storedConfig = storage.readConfig();
            const savedApiKey = storedConfig.apiKey;
            const savedApiUrl = storedConfig.apiUrl;
            const savedModel = storedConfig.model;
            const savedSize = storedConfig.size;
            const savedVip = storedConfig.vipEnabled;

            if (savedApiKey) document.getElementById('apiKey').value = savedApiKey;
            if (savedApiUrl) document.getElementById('apiUrl').value = savedApiUrl;
            if (savedSize) document.getElementById('sizeSelect').value = savedSize;

            setVipEnabled(savedVip);

            if (savedApiKey) {
                fetchAndUpdateModels().then(() => {
                    if (savedModel) {
                        document.getElementById('modelSelect').value = savedModel;
                        const baseModel = getBaseModel(savedModel);
                        if (QUICK_MODELS[baseModel]) {
                            setVipEnabled(savedModel.endsWith(VIP_SUFFIX));
                        }
                        syncQuickModelButtons(savedModel);
                    }
                });
                fetchKeyInfo();
            } else if (savedModel) {
                document.getElementById('modelSelect').value = savedModel;
                const baseModel = getBaseModel(savedModel);
                if (QUICK_MODELS[baseModel]) {
                    setVipEnabled(savedModel.endsWith(VIP_SUFFIX));
                }
                syncQuickModelButtons(savedModel);
            }

            if (!savedModel) {
                setVipEnabled(false);
                selectQuickModel('nano-banana');
            }

            const tempPromptInput = document.getElementById('tempPromptInput');
            if (tempPromptInput) {
                tempPromptInput.addEventListener('input', updateTempPromptClearState);
            }
            updateTempPromptClearState();

            document.addEventListener('keydown', handleGlobalKeydown);
            document.addEventListener('click', handleOutsidePanelClick);
        });

        function handleGlobalKeydown(event) {
            if (event.key === 'Escape' || event.key === 'Esc') {
                const panel = document.getElementById('actionPanel');
                if (panel && panel.classList.contains('open')) {
                    event.preventDefault();
                    collapseActionCenter();
                }
            }
        }

        function persistConfig(apiKey) {
            const model = document.getElementById('modelSelect').value;
            const baseModel = getBaseModel(model);
            storage.writeConfig({
                apiKey,
                apiUrl: document.getElementById('apiUrl').value.trim(),
                model,
                size: document.getElementById('sizeSelect').value
            });

            if (QUICK_MODELS[baseModel]) {
                setVipEnabled(model.endsWith(VIP_SUFFIX));
            }
            syncQuickModelButtons(model);
        }

        function refreshRemoteState(apiKey) {
            if (!apiKey) return;
            fetchAndUpdateModels();
            fetchKeyInfo();
        }

        function handleConfigChange() {
            const apiKey = document.getElementById('apiKey').value.trim();
            persistConfig(apiKey);
            refreshRemoteState(apiKey);
        }

        function triggerGeneration(event) {
            if (event) event.stopPropagation();
            collapseActionCenter();
            setTimeout(generateImage, 400); // 等待收缩动画过半再开始
        }

        // 兼容旧代码的弹窗调用
        function openModal(id) {
            expandActionCenter();
            if (id === 'settingsModal') switchTab('tab-settings');
            if (id === 'promptModal') switchTab('tab-style');
        }

        function closeModal() {
            collapseActionCenter();
        }

        window.onclick = function (event) {
            if (event.target.classList.contains('modal')) {
                event.target.classList.remove('active');
            }
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                referenceImageBase64 = e.target.result;
                referenceImageRatio = null;

                const img = new Image();
                img.onload = () => {
                    if (img.naturalWidth && img.naturalHeight) {
                        referenceImageRatio = img.naturalWidth / img.naturalHeight;
                    }
                };
                img.onerror = () => {
                    referenceImageRatio = null;
                };
                img.src = e.target.result;

                // 更新显示区域的预览
                const up = document.getElementById('uploadPreview');
                up.innerHTML = `<img src="${e.target.result}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius: 16px;">`;

                // 切换到上传 Tab 让用户确认
                expandActionCenter();
                switchTab('tab-upload');
            };
            reader.readAsDataURL(file);
        }

        async function downloadCurrentImage() {
            if (!lastGeneratedImageUrl) {
                showError('暂无可下载的图片');
                return;
            }

            const url = lastGeneratedImageUrl;
            const filename = `image-${Date.now()}.png`;
            const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

            const fallbackDownload = (rawUrl) => {
                const link = document.createElement('a');
                link.href = rawUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
            };

            try {
                const response = await fetch(url, { mode: 'cors' });
                if (!response.ok) throw new Error('下载失败');
                const blob = await response.blob();

                if (isMobile && navigator.share) {
                    const file = new File([blob], filename, { type: blob.type || 'image/png' });
                    try {
                        const shareData = { files: [file], title: 'IMAGE' };
                        if (!navigator.canShare || navigator.canShare(shareData)) {
                            await navigator.share(shareData);
                            return;
                        }
                    } catch (err) {
                        if (err && err.name === 'AbortError') return;
                    }

                    try {
                        await navigator.share({ url, title: 'IMAGE' });
                        return;
                    } catch (err) {
                        if (err && err.name === 'AbortError') return;
                    }
                }

                if (!isMobile && window.showSaveFilePicker && window.isSecureContext) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: filename,
                            types: [{ description: 'Image', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] } }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        return;
                    } catch (err) {
                        if (err && err.name === 'AbortError') return;
                    }
                }

                const objectUrl = URL.createObjectURL(blob);
                fallbackDownload(objectUrl);
                URL.revokeObjectURL(objectUrl);
            } catch (err) {
                try {
                    if (isMobile && navigator.share) {
                        try {
                            await navigator.share({ url, title: 'IMAGE' });
                            return;
                        } catch (shareErr) {
                            if (shareErr && shareErr.name === 'AbortError') return;
                        }
                    }
                    fallbackDownload(url);
                } catch {
                    window.open(url, '_blank');
                }
            }
        }

        function regenerateLast(event) {
            if (event) event.stopPropagation();
            if (!lastGenerationConfig) {
                showError('暂无可重新生成的内容');
                return;
            }
            if (document.getElementById('actionPanel').classList.contains('open')) {
                collapseActionCenter();
            }
            generateImage(lastGenerationConfig);
        }

        async function fetchKeyInfo() {
            const apiKey = document.getElementById('apiKey').value.trim();
            const apiUrl = document.getElementById('apiUrl').value.trim();
            if (!apiKey) return;

            try {
                const response = await fetch(`${apiUrl}/v1/dashboard/billing/subscription`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    balanceFetched = true;
                    if (data.quota !== undefined) {
                        accountBalance = data.quota / 500000;
                        rawQuota = data.quota;
                    } else if (data.hard_limit_usd !== undefined) {
                        accountBalance = data.hard_limit_usd;
                        rawQuota = data.hard_limit_usd * 500000;
                    } else {
                        accountBalance = 0;
                        rawQuota = 0;
                    }
                    updateBalanceDisplay();
                }
            } catch (error) { console.error('获取余额失败:', error); }
        }

        function updateBalanceDisplay() {
            const chip = document.getElementById('balanceDisplay');
            if (balanceFetched) {
                const formattedUSD = (accountBalance || 0).toFixed(2);
                chip.textContent = `余额: $${formattedUSD}`;
            }
            chip.style.display = 'none';
        }

        async function fetchAndUpdateModels() {
            const apiKey = document.getElementById('apiKey').value.trim();
            const apiUrl = document.getElementById('apiUrl').value.trim();
            if (!apiKey) return;

            try {
                const response = await fetch(`${apiUrl}/v1/models`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        updateModelSelect(data.data);
                    }
                }
            } catch (error) { console.error('获取模型失败:', error); loadDefaultModels(); }
        }

        function updateModelSelect(models) {
            const select = document.getElementById('modelSelect');
            const current = select.value;
            select.innerHTML = '';

            // 筛选 google 系列（关键词：banana 或 gemini+image）
            const filtered = models.filter(m => {
                const id = m.id.toLowerCase();
                return id.includes('banana') || (id.includes('gemini') && id.includes('image'));
            });

            if (filtered.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = "未找到匹配模型";
                opt.disabled = true;
                select.appendChild(opt);
                return;
            }

            filtered.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.id;
                select.appendChild(opt);
            });

            // 尽量保持当前选择
            if (current && filtered.some(m => m.id === current)) {
                select.value = current;
            }
        }

        function loadDefaultModels() {
            const defaults = [
                { id: 'gemini-2.0-flash' },
                { id: 'gemini-2.0-pro-exp' },
                { id: 'nano-banana' }
            ];
            updateModelSelect(defaults);
        }

        function updateTempPromptClearState() {
            const input = document.getElementById('tempPromptInput');
            const clearBtn = document.querySelector('.textarea-clear-btn');
            if (!input || !clearBtn) return;
            clearBtn.classList.toggle('is-hidden', input.value.trim().length === 0);
        }

        function clearTempPrompt() {
            const input = document.getElementById('tempPromptInput');
            if (!input) return;
            input.value = '';
            input.focus();
            updateTempPromptClearState();
        }

        function handleOutsidePanelClick(event) {
            const panel = document.getElementById('actionPanel');
            if (!panel || !panel.classList.contains('open')) return;
            if (panel.contains(event.target)) return;
            const button = document.getElementById('actionButton');
            if (button && button.contains(event.target)) return;
            collapseActionCenter();
        }

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
                referenceImageBase64: referenceImageBase64
            };
        }

        async function generateImage(configOverride) {
            const config = configOverride || getCurrentGenerationConfig();
            const apiKey = config.apiKey || '';
            const apiUrl = config.apiUrl || '';
            const model = config.model || '';
            const stylePrompt = normalizePromptText(config.stylePrompt || '');
            const tempPrompt = normalizePromptText(config.tempPrompt || '');
            const size = config.size || '';
            const fullPrompt = normalizePromptText(config.fullPrompt || [tempPrompt, stylePrompt].filter(p => p).join(', '));
            const refImage = config.referenceImageBase64;

            if (!apiKey) return showError('请先配置 API Key');
            if (!tempPrompt && !stylePrompt) return showError('请输入创作灵感');

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
            const actionButton = document.getElementById('actionButton');

            btn.disabled = true;
            updateActionButtonState({ revealing: false, generating: true, hidden: true });
            hideActionTools();
            preview.style.display = 'none';
            hideEmptyState();
            startLoadingParticles(size);

            try {
                const api = window.imageApi;
                if (!api) throw new Error('图片生成模块未加载');

                const request = api.buildImageRequest({
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
                const url = api.parseImageResponse(data);

                if (url) {
                    displayPreview(url);
                    fetchKeyInfo();
                } else {
                    throw new Error('未能从响应中提取到图片地址');
                }

            } catch (e) {
                showError(e.message);
                stopLoadingParticles(true);
                actionButton.classList.remove('hidden');
                showEmptyState();
            } finally {
                btn.disabled = false;
                updateActionButtonState({ generating: false });
            }
        }
    
