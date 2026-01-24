/* ======================================================================
 * [INPUT]: UI 交互状态与页面元素
 * [OUTPUT]: 面板/加载/空态/错误等 UI 控制
 * [POS]: 视图状态管理模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-24
 * ====================================================================== */
(function () {
    function createUiState(options) {
        const actionButtonClasses = options.actionButtonClasses || [];
        const getLastGeneratedImageUrl = options.getLastGeneratedImageUrl || (() => '');
        const setLastGeneratedImageUrl = options.setLastGeneratedImageUrl || (() => {});
        const getReferenceImageRatio = options.getReferenceImageRatio || (() => null);
        const getReferenceImageBase64 = options.getReferenceImageBase64 || (() => null);

        const PANEL_ANIM_FALLBACK_EXTRA_MS = 160;
        let panelAnimationTimer = null;

        let loadingCanvas = null;
        let loadingCtx = null;
        let loadingParticles = [];
        let loadingActive = false;
        let loadingFadeOutStart = null;
        let loadingStartTime = 0;
        let loadingFrameRect = null;
        let loadingSizeValue = '';
        let loadingLastTime = 0;

        function updateActionButtonState(nextState) {
            const button = document.getElementById('actionButton');
            if (!button) return;
            actionButtonClasses.forEach(className => {
                if (!Object.prototype.hasOwnProperty.call(nextState, className)) return;
                button.classList.toggle(className, Boolean(nextState[className]));
            });
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

        function showError(msg) {
            const div = document.getElementById('errorMessage');
            if (!div) return;
            div.textContent = msg;
            div.style.display = 'block';
            setTimeout(() => div.style.display = 'none', 3000);
        }

        function parseCssTimeToMs(value) {
            if (!value) return null;
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed);
            if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000;
            return Number.parseFloat(trimmed);
        }

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

        function switchTab(tabId, event) {
            if (event) event.stopPropagation();
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            } else if (tabId === 'tab-chat') {
                document.getElementById('chatBtn').classList.add('active');
            }
        }

        function expandActionCenter() {
            const panel = document.getElementById('actionPanel');
            const button = document.getElementById('actionButton');
            const cluster = document.querySelector('.action-cluster');
            if (panel.classList.contains('open') || panel.classList.contains('animating')) return;

            const previewImg = document.getElementById('mainPreview');
            if (previewImg.style.display !== 'none' && previewImg.src) {
                previewImg.style.display = 'none';
                previewImg.src = '';
                showEmptyState();
                setLastGeneratedImageUrl('');
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
                if (getLastGeneratedImageUrl()) {
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
                setLastGeneratedImageUrl(url);
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
            const hasReference = Boolean(getReferenceImageBase64());
            const referenceRatio = getReferenceImageRatio();
            const resolvedSize = sizeValue || (hasReference && referenceRatio ? referenceRatio : '1:1');
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
                loadingCtx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
                loadingCtx.fill();
            });

            requestAnimationFrame(animateLoadingParticles);
        }

        return {
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
        };
    }

    window.uiState = {
        create: createUiState
    };
})();
