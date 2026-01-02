<!--
INPUT: 当前架构与运行约定
OUTPUT: 交接与维护说明
POS: 维护者指南
UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
UPDATED: 2026-01-02
-->
# 项目交接说明

## 1. 项目概览

这是一个纯前端、单页面的 AI 图片生成器。核心体验由「底部入口按钮」与「展开式操作面板」组成，生成过程包含加载动画、等待文案与结果淡入显示。入口在 `index.html`，样式与逻辑在 `assets/`，无构建工具。

## 2. 技术栈

- HTML5 + CSS3 + 原生 JavaScript
- 无第三方框架与依赖
- 目标平台：桌面与移动端浏览器

## 3. 目录结构

```
image/
├── .gitignore          # 忽略系统与编辑器噪音文件
├── README.md           # 根目录主文档与规则
├── index.html          # 入口结构
├── assets/             # 样式与脚本
│   ├── styles.css
│   ├── app.js
│   └── FOLDER.md
├── Prompts/            # 预设提示词参考
├── docs/               # 项目文档
│   ├── README.md
│   ├── HANDOVER.md
│   ├── REQUIREMENTS.md
│   ├── REFLECTIONS.md
│   ├── FREEWRITE.md
│   ├── llms.txt
│   └── FOLDER.md
└── meta/               # 规范与身份
    ├── AGENTS.md
    ├── CodexRole.md
    └── FOLDER.md
```

## 4. 关键界面与交互

### 4.1 入口按钮与面板

- **入口按钮**：`.action-button`，底部中央彩色渐变按钮
- **面板**：`.action-panel`，展开后显示设置/预设/上传/对话
- **动画**：`expandActionCenter()` 与 `collapseActionCenter()` 采用 FLIP 思路（先计算矩形、再缩放位移）
- 相关状态类：
  - `.open` / `.animating` 控制面板交互与过渡
  - `.hidden` / `.revealing` 控制入口按钮显隐
  - `.blocked` 禁止入口按钮点击（避免动画中断）

### 4.2 Tab 与面板内容

面板底部为 tab 栏（`.aux-bar`），对应四个内容区：

- **系统设置**：API Key + 模型与比例 + 其他模型
- **风格预设**：仅预设按钮，不显示文本输入框
- **使用图片**：上传参考图（仅更新上传预览，不影响主预览）
- **自由对话**：固定高度文本框，内部可滚动

面板滚动策略：`switchTab()` 为 **设置 / 预设 / 对话** 添加 `.no-scroll`，避免面板整体滚动。

### 4.3 预览区与加载动画

预览区结构：

- `#mainPreview`：生成结果，虚线边框 + 淡入
- `#preloadFrame`：预先占位的“提前位”
- `#loadingCanvas`：粒子 + 连线动画
- `#loadingCaption`：等待文案（固定在 tab 栏上方位置）
- 预载框比例：显式比例优先；未设置比例但有参考图时按参考图比例，否则默认 1:1

加载相关函数：

- `startLoadingParticles(size)`：显示预载框、粒子与等待文案
- `stopLoadingParticles()` / `resetLoadingVisuals()`：结束动画并清理
- `displayPreview(url)`：预加载图片并淡入显示

## 5. 生成流程与状态

核心流程在 `assets/app.js` 的 `generateImage()`：

1. 读取配置（API Key / 模型 / 比例 / Prompt / 参考图）
2. 缓存 `lastGenerationConfig`（用于重新生成）
3. 隐藏入口按钮、隐藏空态文案、启动加载动画
4. 请求 API → 解析 URL → `displayPreview()`
5. 显示下载/重新生成按钮

运行时关键状态：

- `referenceImageBase64`：上传图的 base64
- `lastGenerationConfig`：用于重新生成
- `lastGeneratedImageUrl`：用于下载/分享

本地缓存（localStorage）：

- `apiKey`, `apiUrl`, `model`, `size`

## 6. API 路由与协议

`assets/app.js` 的 `generateImage()` 内有智能路由：

- **OpenAI 兼容**：当模型名包含 `banana`
  - `POST /v1/images/generations`
  - `size` 从 `A:B` 转成 `AxB`
  - `image` 为 base64 数组（图生图）
- **Google 原生**：其他模型
  - `POST /v1beta/models/{model}:generateContent`
  - `generationConfig.imageConfig.aspectRatio` 接收 `A:B`

响应解析：

- 原生：从 `candidates[0].content.parts` 中提取 URL
- 兼容：从 `data[0].url` 读取

## 7. 下载与分享

`downloadCurrentImage()`：

- **移动端**：优先使用 `navigator.share`（文件或 URL）
- **桌面端**：优先 `showSaveFilePicker`（需 https/localhost），否则回退到 `<a download>`

## 8. 常见改动点

- **预设文案**：`presetData`（位于 `assets/app.js`）
- **比例选项**：`#sizeSelect`（模型比例区域）
- **模型筛选逻辑**：`updateModelSelect()` 的过滤条件
- **面板动画速度**：CSS 变量 `--panel-duration` 与 `PANEL_ANIM_MS`
- **等待文案位置**：CSS `--panel-bottom-offset` 与 `.loading-caption`
- **余额显示**：`updateBalanceDisplay()` 当前强制隐藏

## 9. 注意事项

- 余额查询逻辑仍在，但 UI 已隐藏
- `Prompts/` 内的 Markdown 仅作为参考，真正生效的是 `presetData`
- `showSaveFilePicker` 与 `navigator.share` 需要 `https/localhost`

如需进一步扩展，可继续在 `assets/` 内拆分模块文件并保持无构建模式。
