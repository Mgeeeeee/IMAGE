# 🏗️ Project Handover: MGEEEEEE LAB AI Image Generator

## 1. 项目简介 (Project Overview)
这是一个极简主义风格的 AI 图像生成网页应用 (Single Page Application)。
核心理念是 **"Less is More"**，通过沉浸式的全屏预览、动态呼吸的品牌标识以及独创的 **"Morphing Action Center" (魔幻变形操作中心)**，为用户提供极致流畅的创作体验。

后端逻辑兼容 **Google Gemini Native Protocol** 和 **OpenAI Compatible Protocol**，支持多种模型（如 Gemini 2.0, Banana 等）和自定义比例生图。

---

## 2. 技术栈 (Tech Stack)
本项目采用 **Vanilla Tech Stack**，无构建工具，无复杂依赖，开箱即用：
- **HTML5**: 语义化结构。
- **CSS3**: 大量使用 CSS Variables, Flexbox, Transitions, Animations 和 Backdrop-filter。
- **JavaScript (ES6+)**: 原生 JS 实现所有逻辑，无 jQuery 或 Vue/React。

---

## 3. 核心架构与代码结构 (Architecture)
目前采用 **单文件组件 (Single File)** 模式，所有代码位于 `index.html` 中，便于快速部署和修改。

### 3.1 目录结构
```
/Users/mgeeeeee/Documents/Project/image/
├── index.html          # 核心入口 (HTML + CSS + JS)
├── Prompts/            # 提示词库 (Markdown)
└── (其他资源文件)
```

### 3.2 `index.html` 逻辑分层
代码约 1000 行，逻辑分层如下：

1.  **CSS Styles (`<style>`)**:
    *   **Variables**: 定义颜色 (`--bg`, `--accent-color`)、字体和阴影。
    *   **Layout**: 绝对定位居中布局，适配移动端 Safe Area。
    *   **Components**: `.action-center`, `.preview-container`, `.empty-state`。
    *   **Animations**: `@keyframes solidBreath` (呼吸灯), Morphing Transitions (变形动画)。

2.  **HTML Structure**:
    *   `#bgCanvas`: 背景动态 Canvas。
    *   `.preview-area`: 图片展示区。
    *   `.action-center`: 核心交互容器（悬浮于底部）。

3.  **JavaScript Logic**:
    *   **Background System**: `BgAnimation` 类，负责绘制动态连接线背景。
    *   **UI Interaction**: `expandActionCenter`, `collapseActionCenter`, `switchTab`。
    *   **Configuration**: `localStorage` 存取 API Key 和 Model 设置。
    *   **API Client**: `generateImage` 函数，包含智能路由逻辑。

---

## 4. 关键功能实现 (Key Implementation Details)

### 4.1 魔幻变形交互 (Morphing Action Center)
这是本项目的 UI 灵魂。
- **原理**: 同一个 DOM 元素 `.action-center` 在两种状态间切换：
    - **Collapsed (Default)**: `width: 56px; height: 56px; borderRadius: 50%`。
    - **Expanded**: `width: 95%; height: 500px; borderRadius: 32px`。
- **动画**: 使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 实现带有弹性阻尼的物理质感。
- **交互难点修复**: 
    - **点击穿透**: 折叠态下，内部透明的 Tab 按钮遮挡了点击。通过 CSS `pointer-events: none` (折叠时) 和 `auto` (展开时) 解决。
    - **自动闭环**: 点击生成后，自动收起面板并清空预览，让用户专注于等待结果。

### 4.2 智能 API 路由 (Smart Router)
为了解决 `ERR_CONNECTION_CLOSED` 并兼容不同厂商模型，实现了混合路由协议：
- **Google Native Protocol (`:generateContent`)**:
    - **适用**: 默认所有 **Gemini** 系列模型。
    - **优势**: 支持长连接，原生支持 `21:9` 等特殊比例 (通过 `aspectRatio`), Base64 处理更稳定。
- **OpenAI Compatible Protocol (`/v1/images/generations`)**:
    - **适用**: 包含 `banana` 关键词的第三方模型, 或明确需要 DALL-E 格式的模型。
    - **逻辑**: 代码中通过 `isGenerationsApi` 变量自动判断。

### 4.3 动态背景系统
- 使用 Canvas API 绘制游走的粒子与连接线。
- 粒子颜色与透明度随机化，配合 CSS 的 `backdrop-filter: blur(20px)`，营造出深邃的空间感。

---

## 5. 维护指南 (Maintenance Guide)

### 5.1 修改模型列表
在 JS 函数 `loadDefaultModels` 和 `updateModelSelect` 中管理：
```javascript
// 添加新模型只需在 defaults 数组中追加对象
const defaults = [
    { id: 'gemini-2.0-flash' },
    { id: 'new-model-id' } // Add new model here
];
```

### 5.2 调整 API 路由策略
关注 `generateImage` 函数中的 `isGenerationsApi` 判断逻辑：
```javascript
// 若需强制某模型走 OpenAI 格式，在此添加条件
const isGenerationsApi = model.toLowerCase().includes('banana') || model.includes('new-legacy-model');
```

---

## 6. 接下来的工作 (Todo & Roadmap)
1.  **代码拆分 (Refactoring)**:
    - 随着功能增加，建议将 CSS 提取为 `style.css`，JS 提取为 `app.js`。
2.  **多图历史记录**:
    - 目前仅支持单图预览，可增加 Sidebar 展示历史生成记录。
3.  **Prompt 优化**:
    - 集成 LLM 优化用户的简短提示词（Magic Prompt）。

---

> **文档生成时间**: 2026-01-01
> **最后维护者**: Antigravity (Google Deepmind)
