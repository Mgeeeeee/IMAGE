<!--
INPUT: 当前实现与交互约定
OUTPUT: 使用说明与流程
POS: 用户向导文档
UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
UPDATED: 2026-01-21
-->
# IMAGE

一个纯前端、单页的 AI 图片生成器。界面以底部入口按钮与可展开的操作面板为中心，支持文生图/图生图、预设风格、比例选择、结果下载与重新生成。

## 功能概览

- 单页应用，无构建工具，入口在 `index.html`，逻辑与样式在 `assets/`
- 文生图 + 图生图（上传参考图）
- 风格预设：点击预设直接应用，无文本输入框
- 模型与比例：VIP 切换 + 快捷模型 + 比例下拉 + 其他模型列表
- 自由对话：右下角一键清空按钮（有内容时显示）
- 面板关闭：点击面板外区域
- 生成中提示：预设比例的粒子与连线动画 + “美好值得等待”呼吸文案
- 生成完成：图片淡入，左侧下载/右侧重新生成
- 桌面端优先“保存为”，移动端优先系统分享面板

## 快速开始

方式一：直接打开 `index.html`  
方式二：本地静态服务（推荐，便于分享与权限）

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

> 注：桌面端 `showSaveFilePicker` 仅在 `https` 或 `localhost` 生效；移动端分享面板同理。

## 使用流程

1. 点击底部入口按钮展开面板  
2. **系统设置**
   - 填写 API Key
   - 模型设置（VIP / 🍌 / 🍌 PRO / 选择比例下拉）
   - 其他模型（下拉列表）
3. **风格预设**：点击需要的预设  
4. **使用图片**：可选上传参考图  
5. **自由对话**：输入提示词并点击生图按钮（右下角清空按钮可一键清空）  
6. 图片生成完成后，使用下载或重新生成按钮

## 目录结构

```
image/
├── .gitignore          # 忽略系统与编辑器噪音文件
├── .nojekyll           # GitHub Pages 静态站点兼容
├── AGENTS.md           # 根目录主文档与规则
├── index.html          # 入口结构
├── assets/             # 样式与脚本
│   ├── 1.png
│   ├── styles.css
│   ├── app.js
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── svgviewer-png-output.png
│   └── FOLDER.md
├── scripts/            # 本地校验脚本
│   ├── check_headers.sh
│   └── FOLDER.md
├── daily/              # 日常记录
│   ├── FREEWRITE.md
│   └── FOLDER.md
├── Prompts/            # 预设文本参考
├── skills/             # 可复用技能与协作指南
│   ├── ui-skills/
│   │   └── SKILL.md
│   ├── WebInterfaceGuidelines/
│   │   └── SKILL.md
│   └── FOLDER.md
├── docs/               # 项目文档
│   ├── README.md
│   ├── REPOSITORY_GUIDELINES.md
│   ├── LOG.md
│   ├── llms.txt
│   └── FOLDER.md
```

## 维护提示

- 预设风格文本在 `assets/app.js` 的 `presetData` 中维护  
- API 路由逻辑在 `assets/app.js` 的 `generateImage()`  
- 本地缓存使用 `localStorage`：`apiKey`、`apiUrl`、`model`、`size`、`vip`
- 预设面板与面板动画参数见 `assets/app.js` 与 `assets/styles.css`
- 等待文案与加载动画位置通过 `.loading-caption` 与 `--panel-bottom-offset` 调整
- 余额显示逻辑仍在，但 UI 已隐藏（`updateBalanceDisplay()`）
- `Prompts/` 仅供参考，真实生效内容在 `presetData`
- `showSaveFilePicker` 与 `navigator.share` 需要 `https` 或 `localhost`
- 可选执行 `scripts/check_headers.sh` 验证文件头一致性

## 交接说明

### 项目概览

这是一个纯前端、单页面的 AI 图片生成器。核心体验由“底部入口按钮”与“展开式操作面板”组成，生成过程包含加载动画、等待文案与结果淡入显示。入口在 `index.html`，样式与逻辑在 `assets/`，无构建工具。

### 技术栈

- HTML5 + CSS3 + 原生 JavaScript
- 无第三方框架与依赖
- 目标平台：桌面与移动端浏览器

### 关键界面与交互

#### 入口按钮与面板

- **入口按钮**：`.action-button`，底部中央彩色渐变按钮
- **面板**：`.action-panel`，展开后显示设置/预设/上传/对话
- **关闭交互**：点击面板外区域
- **动画**：`expandActionCenter()` 与 `collapseActionCenter()` 采用 FLIP 思路
- 相关状态类：
  - `.open` / `.animating` 控制面板交互与过渡
  - `.hidden` / `.revealing` 控制入口按钮显隐
  - `.blocked` 禁止入口按钮点击（避免动画中断）

#### Tab 与面板内容

面板底部为 tab 栏（`.aux-bar`），对应四个内容区：

- **系统设置**：API Key + 模型与比例 + 其他模型
- **风格预设**：仅预设按钮，不显示文本输入框
- **使用图片**：上传参考图（仅更新上传预览，不影响主预览）
- **自由对话**：固定高度文本框，内部可滚动，右下角清空按钮（有内容时显示）

面板滚动策略：面板允许滚动，滚动条隐藏，标题栏使用 `position: sticky` 固定在顶部。

#### 预览区与加载动画

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

### 生成流程与状态

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

### API 路由与协议

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

### 下载与分享

`downloadCurrentImage()`：

- **移动端**：优先使用 `navigator.share`（文件或 URL）
- **桌面端**：优先 `showSaveFilePicker`（需 https/localhost），否则回退到 `<a download>`

如需进一步扩展，可继续在 `assets/` 内拆分模块文件并保持无构建模式。
