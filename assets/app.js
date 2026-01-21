/* ======================================================================
 * [INPUT]: 页面交互与业务逻辑
 * [OUTPUT]: UI 事件与生成流程
 * [POS]: 全局脚本入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-21
 * ====================================================================== */
        let availableModels = [];
        let referenceImageBase64 = null;
        let lastGenerationConfig = null;
        let lastGeneratedImageUrl = '';
        let referenceImageRatio = null;
        let loadingCanvas = null;
        let loadingCtx = null;
        let loadingParticles = [];
        let loadingActive = false;
        let loadingFadeOutStart = null;
        let loadingStartTime = 0;
        let loadingFrameRect = null;
        let loadingSizeValue = '';
        let loadingLastTime = 0;
        const VIP_SUFFIX = '-vip';
        const VIP_STORAGE_KEY = 'vip';
        const QUICK_MODELS = {
            'nano-banana': 'btn-banana',
            'nano-banana-2': 'btn-banana-pro'
        };
        const ACTION_BUTTON_CLASSES = ['hidden', 'revealing', 'generating'];

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

        function updateActionButtonState(nextState) {
            const button = document.getElementById('actionButton');
            if (!button) return;
            ACTION_BUTTON_CLASSES.forEach(className => {
                if (!Object.prototype.hasOwnProperty.call(nextState, className)) return;
                button.classList.toggle(className, Boolean(nextState[className]));
            });
        }

        function isVipEnabled() {
            return localStorage.getItem(VIP_STORAGE_KEY) === '1';
        }

        function setVipEnabled(enabled) {
            localStorage.setItem(VIP_STORAGE_KEY, enabled ? '1' : '0');
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
            // 如果下拉列表里没有这个值（还没加载），直接存入 localStorage 也会生效
            localStorage.setItem('model', modelId);

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

            const savedApiKey = localStorage.getItem('apiKey');
            const savedApiUrl = localStorage.getItem('apiUrl');
            const savedModel = localStorage.getItem('model');
            const savedSize = localStorage.getItem('size');
            const savedVip = localStorage.getItem(VIP_STORAGE_KEY) === '1';

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
            localStorage.setItem('apiKey', apiKey);
            localStorage.setItem('apiUrl', document.getElementById('apiUrl').value.trim());
            const model = document.getElementById('modelSelect').value;
            const baseModel = getBaseModel(model);
            localStorage.setItem('model', model);
            localStorage.setItem('size', document.getElementById('sizeSelect').value);

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


        // --- 操作中心逻辑 ---
        const PANEL_ANIM_FALLBACK_EXTRA_MS = 160;
        let panelAnimationTimer = null;

        function parseCssTimeToMs(value) {
            if (!value) return null;
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed);
            if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000;
            return Number.parseFloat(trimmed);
        }

        // 读取 CSS 动效时长，保持 JS 兜底与样式同源
        function getCssDurationMs(varName, fallbackMs) {
            const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
            const parsed = parseCssTimeToMs(value);
            return Number.isFinite(parsed) ? parsed : fallbackMs;
        }

        function getPanelAnimFallbackMs() {
            return getCssDurationMs('--panel-duration', 520) + PANEL_ANIM_FALLBACK_EXTRA_MS;
        }

        function getRectCenter(rect) {
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }

        function getPanelFlipDelta(buttonRect, panelRect) {
            const buttonCenter = getRectCenter(buttonRect);
            const panelCenter = getRectCenter(panelRect);
            return {
                dx: buttonCenter.x - panelCenter.x,
                dy: buttonCenter.y - panelCenter.y,
                sx: buttonRect.width / panelRect.width,
                sy: buttonRect.height / panelRect.height
            };
        }

        function expandActionCenter() {
            const panel = document.getElementById('actionPanel');
            const button = document.getElementById('actionButton');
            const cluster = document.querySelector('.action-cluster');
            if (panel.classList.contains('open') || panel.classList.contains('animating')) return;

            // 每次展开时，如果当前有生图结果，则重置回初始状态 (点击即回归)
            const previewImg = document.getElementById('mainPreview');

            if (previewImg.style.display !== 'none' && previewImg.src) {
                previewImg.style.display = 'none';
                previewImg.src = '';
                showEmptyState();
                lastGeneratedImageUrl = '';
                hideActionTools();
                stopLoadingParticles(true);
            }

            const buttonRect = button.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const { dx, dy, sx, sy } = getPanelFlipDelta(buttonRect, panelRect);
            const buttonRadius = Math.max(buttonRect.width / 2, 16);

            panel.classList.add('open', 'animating');
            panel.style.transition = 'none';
            panel.style.transform = `translate3d(-50%, 0, 0) translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
            panel.style.borderRadius = `${buttonRadius}px`;
            panel.style.opacity = '1';
            panel.getBoundingClientRect();
            updateActionButtonState({ revealing: false, hidden: true });
            if (cluster) cluster.classList.add('blocked');
            hideActionTools();

            requestAnimationFrame(() => {
                panel.style.transition = '';
                panel.style.transform = '';
                panel.style.borderRadius = '';
            });

            const onEnd = (event) => {
                if (event.propertyName !== 'transform') return;
                if (panelAnimationTimer) {
                    clearTimeout(panelAnimationTimer);
                    panelAnimationTimer = null;
                }
                panel.classList.remove('animating');
                panel.removeEventListener('transitionend', onEnd);
            };
            panel.addEventListener('transitionend', onEnd);
            if (panelAnimationTimer) clearTimeout(panelAnimationTimer);
            panelAnimationTimer = setTimeout(() => {
                panel.classList.remove('animating');
                panel.removeEventListener('transitionend', onEnd);
                panelAnimationTimer = null;
            }, getPanelAnimFallbackMs());

            // 展开后默认显示对话 Tab
            switchTab('tab-chat');
        }

        function collapseActionCenter(event) {
            if (event) event.stopPropagation();
            const panel = document.getElementById('actionPanel');
            const button = document.getElementById('actionButton');
            const cluster = document.querySelector('.action-cluster');
            if (!panel.classList.contains('open') || panel.classList.contains('animating')) return;

            const buttonRect = button.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const { dx, dy, sx, sy } = getPanelFlipDelta(buttonRect, panelRect);
            const buttonRadius = Math.max(buttonRect.width / 2, 16);

            panel.classList.add('animating');
            panel.style.opacity = '0';
            updateActionButtonState({ hidden: false, revealing: true });
            panel.style.transform = `translate3d(-50%, 0, 0) translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
            panel.style.borderRadius = `${buttonRadius}px`;

            let finished = false;
            const finalize = () => {
                if (finished) return;
                finished = true;
                if (panelAnimationTimer) {
                    clearTimeout(panelAnimationTimer);
                    panelAnimationTimer = null;
                }
                panel.style.transition = 'none';
                panel.classList.remove('open');
                panel.classList.remove('animating');
                panel.style.transform = '';
                panel.style.borderRadius = '';
                panel.getBoundingClientRect();
                panel.style.transition = '';
                panel.style.opacity = '';
                updateActionButtonState({ revealing: false });
                if (cluster) cluster.classList.remove('blocked');
                if (lastGeneratedImageUrl) {
                    showActionTools();
                }
                panel.removeEventListener('transitionend', onEnd);
            };
            const onEnd = (eventEnd) => {
                if (eventEnd.propertyName !== 'transform') return;
                finalize();
            };
            panel.addEventListener('transitionend', onEnd);
            if (panelAnimationTimer) clearTimeout(panelAnimationTimer);
            panelAnimationTimer = setTimeout(() => {
                finalize();
            }, getPanelAnimFallbackMs());
        }

        function switchTab(tabId, event) {
            if (event) event.stopPropagation();
            // 切换内容
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            // 切换按钮状态
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            // 查找对应的按钮并加 active (这里简单处理，通过传参或索引)
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            } else if (tabId === 'tab-chat') {
                document.getElementById('chatBtn').classList.add('active');
            }
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

        function displayPreview(url) {
            const img = document.getElementById('mainPreview');
            img.classList.remove('revealed');
            img.style.display = 'block';
            img.classList.add('active');
            hideEmptyState();

            const loader = new Image();
            loader.onload = () => {
                img.src = url;
                requestAnimationFrame(() => img.classList.add('revealed'));
                lastGeneratedImageUrl = url;
                stopLoadingParticles();
                updateActionButtonState({ hidden: false });
                showActionTools();
            };
            loader.onerror = () => {
                stopLoadingParticles(true);
                updateActionButtonState({ hidden: false });
                showError('图片加载失败');
            };
            loader.src = url;
        }

        function showActionTools() {
            const downloadBtn = document.getElementById('downloadBtn');
            const regenBtn = document.getElementById('regenBtn');
            if (downloadBtn) downloadBtn.classList.add('visible');
            if (regenBtn) regenBtn.classList.add('visible');
        }

        function hideActionTools() {
            const downloadBtn = document.getElementById('downloadBtn');
            const regenBtn = document.getElementById('regenBtn');
            if (downloadBtn) downloadBtn.classList.remove('visible');
            if (regenBtn) regenBtn.classList.remove('visible');
        }

        function showEmptyState() {
            const empty = document.getElementById('emptyState');
            if (empty) empty.classList.remove('hidden');
        }

        function hideEmptyState() {
            const empty = document.getElementById('emptyState');
            if (empty) empty.classList.add('hidden');
        }

        function showLoadingCaption() {
            const caption = document.getElementById('loadingCaption');
            if (caption) caption.classList.add('active');
        }

        function hideLoadingCaption() {
            const caption = document.getElementById('loadingCaption');
            if (caption) caption.classList.remove('active');
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

        function initLoadingVisuals() {
            loadingCanvas = document.getElementById('loadingCanvas');
            if (!loadingCanvas) return;
            loadingCtx = loadingCanvas.getContext('2d');
            window.addEventListener('resize', () => {
                if (!loadingActive) return;
                updatePreloadFrame(loadingSizeValue);
                sizeLoadingCanvas();
            });
        }

        function sizeLoadingCanvas() {
            if (!loadingCanvas || !loadingCtx) return;
            const container = document.getElementById('previewContainer');
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            loadingCanvas.width = rect.width * dpr;
            loadingCanvas.height = rect.height * dpr;
            loadingCanvas.style.width = `${rect.width}px`;
            loadingCanvas.style.height = `${rect.height}px`;
            loadingCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function updatePreloadFrame(sizeValue) {
            const frame = document.getElementById('preloadFrame');
            const container = document.getElementById('previewContainer');
            if (!frame || !container) return;

            const rect = container.getBoundingClientRect();
            const ratio = getSizeRatio(sizeValue || '1:1');
            const maxW = rect.width * 0.88;
            const maxH = rect.height * 0.88;
            let width = maxW;
            let height = width / ratio;
            if (height > maxH) {
                height = maxH;
                width = height * ratio;
            }

            frame.style.width = `${Math.max(160, width)}px`;
            frame.style.height = `${Math.max(160, height)}px`;

            const frameRect = frame.getBoundingClientRect();
            loadingFrameRect = {
                x: frameRect.left - rect.left,
                y: frameRect.top - rect.top,
                width: frameRect.width,
                height: frameRect.height
            };
        }

        function getSizeRatio(sizeValue) {
            if (typeof sizeValue === 'number' && Number.isFinite(sizeValue) && sizeValue > 0) {
                return sizeValue;
            }
            if (!sizeValue || !sizeValue.includes(':')) return 1;
            const parts = sizeValue.split(':').map(Number);
            if (parts.length !== 2 || !parts[0] || !parts[1]) return 1;
            return parts[0] / parts[1];
        }

        function startLoadingParticles(sizeValue) {
            const frame = document.getElementById('preloadFrame');
            const canvas = document.getElementById('loadingCanvas');
            const resolvedSize = sizeValue || (referenceImageBase64 && referenceImageRatio ? referenceImageRatio : '1:1');
            loadingSizeValue = resolvedSize;
            updatePreloadFrame(resolvedSize);
            sizeLoadingCanvas();

            if (frame) frame.classList.add('visible');
            if (canvas) canvas.classList.add('active');
            showLoadingCaption();

            loadingActive = true;
            loadingFadeOutStart = null;
            loadingStartTime = performance.now();
            loadingLastTime = 0;
            createLoadingParticles();
            requestAnimationFrame(animateLoadingParticles);
        }

        function stopLoadingParticles(immediate = false) {
            if (!loadingActive) {
                resetLoadingVisuals();
                return;
            }
            hideLoadingCaption();
            if (immediate) {
                resetLoadingVisuals();
                return;
            }
            loadingFadeOutStart = performance.now();
        }

        function resetLoadingVisuals() {
            const frame = document.getElementById('preloadFrame');
            const canvas = document.getElementById('loadingCanvas');
            if (frame) frame.classList.remove('visible');
            if (canvas) {
                canvas.classList.remove('active');
                if (loadingCtx) {
                    loadingCtx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            hideLoadingCaption();
            loadingActive = false;
            loadingFadeOutStart = null;
            loadingParticles = [];
            loadingLastTime = 0;
        }

        function createLoadingParticles() {
            if (!loadingFrameRect || !loadingCanvas) return;
            const count = Math.max(40, Math.floor((loadingFrameRect.width * loadingFrameRect.height) / 9000));
            const edgeRatio = 0;
            loadingParticles = Array.from({ length: count }, () => {
                const isEdge = Math.random() < edgeRatio;
                const edge = Math.floor(Math.random() * 4);
                let x = loadingFrameRect.x + Math.random() * loadingFrameRect.width;
                let y = loadingFrameRect.y + Math.random() * loadingFrameRect.height;
                let vx = (Math.random() - 0.5) * 1.1;
                let vy = (Math.random() - 0.5) * 1.1;

                if (isEdge) {
                    const edgeSpeed = (Math.random() * 0.9 + 0.5) * (Math.random() < 0.5 ? -1 : 1);
                    if (edge === 0 || edge === 2) {
                        y = edge === 0 ? loadingFrameRect.y : loadingFrameRect.y + loadingFrameRect.height;
                        vx = edgeSpeed;
                        vy = 0;
                    } else {
                        x = edge === 3 ? loadingFrameRect.x : loadingFrameRect.x + loadingFrameRect.width;
                        vy = edgeSpeed;
                        vx = 0;
                    }
                }
                return {
                    x,
                    y,
                    vx,
                    vy,
                    mode: isEdge ? 'edge' : 'field',
                    edge,
                    alpha: 0,
                    delay: Math.random() * 300
                };
            });
        }

        function animateLoadingParticles(now) {
            if (!loadingActive || !loadingCtx || !loadingCanvas) return;
            const rect = loadingCanvas.getBoundingClientRect();
            loadingCtx.clearRect(0, 0, rect.width, rect.height);

            const elapsed = now - loadingStartTime;
            const delta = loadingLastTime ? Math.min(2, (now - loadingLastTime) / 16.6) : 1;
            loadingLastTime = now;
            let fade = 1;
            if (loadingFadeOutStart) {
                fade = 1 - (now - loadingFadeOutStart) / 500;
                if (fade <= 0) {
                    resetLoadingVisuals();
                    return;
                }
            }

            const rendered = [];
            const bounds = loadingFrameRect;
            loadingParticles.forEach((p) => {
                if (elapsed < p.delay) {
                    return;
                }
                p.alpha = Math.min(1, (elapsed - p.delay) / 400);
                if (bounds) {
                    if (p.mode === 'edge') {
                        if (p.edge === 0 || p.edge === 2) {
                            p.x += p.vx * delta;
                            const minX = bounds.x;
                            const maxX = bounds.x + bounds.width;
                            if (p.x < minX) {
                                p.x = minX;
                                p.vx *= -1;
                            } else if (p.x > maxX) {
                                p.x = maxX;
                                p.vx *= -1;
                            }
                            p.y = p.edge === 0 ? bounds.y : bounds.y + bounds.height;
                        } else {
                            p.y += p.vy * delta;
                            const minY = bounds.y;
                            const maxY = bounds.y + bounds.height;
                            if (p.y < minY) {
                                p.y = minY;
                                p.vy *= -1;
                            } else if (p.y > maxY) {
                                p.y = maxY;
                                p.vy *= -1;
                            }
                            p.x = p.edge === 3 ? bounds.x : bounds.x + bounds.width;
                        }
                    } else {
                        p.x += p.vx * delta;
                        p.y += p.vy * delta;

                        if (p.x < bounds.x) {
                            p.x = bounds.x;
                            p.vx *= -1;
                        } else if (p.x > bounds.x + bounds.width) {
                            p.x = bounds.x + bounds.width;
                            p.vx *= -1;
                        }
                        if (p.y < bounds.y) {
                            p.y = bounds.y;
                            p.vy *= -1;
                        } else if (p.y > bounds.y + bounds.height) {
                            p.y = bounds.y + bounds.height;
                            p.vy *= -1;
                        }
                    }
                }

                const alpha = 0.45 * p.alpha * fade;
                rendered.push({ x: p.x, y: p.y, alpha });
            });

            const maxDist = 120;
            for (let i = 0; i < rendered.length; i++) {
                for (let j = i + 1; j < rendered.length; j++) {
                    const a = rendered[i];
                    const b = rendered[j];
                    const dist = Math.hypot(a.x - b.x, a.y - b.y);
                    if (dist > maxDist) continue;
                    const strength = (1 - dist / maxDist) * Math.min(a.alpha, b.alpha) * 0.4;
                    loadingCtx.strokeStyle = `rgba(0, 0, 0, ${strength})`;
                    loadingCtx.lineWidth = 1;
                    loadingCtx.beginPath();
                    loadingCtx.moveTo(a.x, a.y);
                    loadingCtx.lineTo(b.x, b.y);
                    loadingCtx.stroke();
                }
            }

            rendered.forEach((p) => {
                loadingCtx.fillStyle = `rgba(0, 0, 0, ${p.alpha})`;
                loadingCtx.beginPath();
                loadingCtx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
                loadingCtx.fill();
            });

            requestAnimationFrame(animateLoadingParticles);
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

        function showError(msg) {
            const div = document.getElementById('errorMessage');
            div.textContent = msg;
            div.style.display = 'block';
            setTimeout(() => div.style.display = 'none', 3000);
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
            const stylePrompt = activePreset ? presetData[activePreset.textContent] || '' : '';
            const tempPrompt = document.getElementById('tempPromptInput').value.trim();
            const size = document.getElementById('sizeSelect').value;
            const fullPrompt = [tempPrompt, stylePrompt].filter(p => p).join(', ');
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
            const stylePrompt = config.stylePrompt || '';
            const tempPrompt = config.tempPrompt || '';
            const size = config.size || '';
            const fullPrompt = config.fullPrompt || [tempPrompt, stylePrompt].filter(p => p).join(', ');
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
                // 智能路由逻辑：优先原生协议以获得更好的连通性和功能支持
                // 仅特定的第三方桥接模型（如 banana）强制使用 OpenAI 兼容路由
                const isGenerationsApi = model.toLowerCase().includes('banana');

                console.log(`[Router] Model: ${model}, AspectRatio: ${size}, Protocol: ${isGenerationsApi ? 'OpenAI-Compatible' : 'Google-Native'}`);

                let res;
                if (isGenerationsApi) {
                    // --- 方案 A: 使用 /v1/images/generations (DALL-E 兼容格式) ---
                    const requestBody = {
                        model: model,
                        prompt: fullPrompt,
                        n: 1,
                        size: size.replace(':', 'x'), // 转换为 21x9 格式
                        response_format: 'url'
                    };

                    if (refImage) {
                        requestBody.image = [refImage];
                    }

                    res = await fetch(`${apiUrl}/v1/images/generations`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify(requestBody)
                    });
                } else {
                    // --- 方案 B: 使用 Google 原生 :generateContent 协议 ---
                    const nativeBody = {
                        contents: [{ parts: [] }],
                        generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
                    };

                    // 处理参考图
                    if (refImage) {
                        const base64Data = refImage.split(',')[1] || refImage;
                        nativeBody.contents[0].parts.push({
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        });
                    }

                    // 添加文本提示词
                    nativeBody.contents[0].parts.push({ text: fullPrompt });

                    // 设置比例 (仅当 size 包含冒号时作为 aspectRatio 传递)
                    if (size && size.includes(':')) {
                        nativeBody.generationConfig.imageConfig = { aspectRatio: size };
                    }

                    res = await fetch(`${apiUrl}/v1beta/models/${model}:generateContent`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify(nativeBody)
                    });
                }

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error?.message || '请求失败，请检查 API 权限');
                }

                const data = await res.json();
                let url = null;

                // 统一兼容性解析
                if (data.candidates && data.candidates[0]?.content?.parts) {
                    // 原生响应解析
                    for (const part of data.candidates[0].content.parts) {
                        if (part.text) {
                            const match = part.text.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|gif|webp)/i);
                            if (match) url = match[0];
                        }
                    }
                } else if (data.data && data.data[0]?.url) {
                    // 兼容响应解析
                    url = data.data[0].url;
                }

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
    
