<!--
INPUT: 当前实现与交互约定
OUTPUT: 使用说明与流程
POS: 用户向导文档
UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
UPDATED: 2026-01-02
-->
# IMAGE

一个纯前端、单页的 AI 图片生成器。界面以底部入口按钮与可展开的操作面板为中心，支持文生图/图生图、预设风格、比例选择、结果下载与重新生成。

## 功能概览

- 单页应用，无构建工具，入口在 `index.html`，逻辑与样式在 `assets/`
- 文生图 + 图生图（上传参考图）
- 风格预设：点击预设直接应用，无文本输入框
- 模型与比例：快捷模型 + 比例下拉 + 其他模型列表
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
   - 模型比例（🍌 / 🍌 PRO / 选择比例下拉）
   - 其他模型（下拉列表）
3. **风格预设**：点击需要的预设  
4. **使用图片**：可选上传参考图  
5. **自由对话**：输入提示词并点击生图按钮  
6. 图片生成完成后，使用下载或重新生成按钮

## 目录结构

```
image/
├── .gitignore          # 忽略系统与编辑器噪音文件
├── README.md           # 根目录主文档与规则
├── index.html          # 入口结构
├── assets/             # 样式与脚本
│   ├── styles.css
│   ├── app.js
│   └── FOLDER.md
├── Prompts/            # 预设文本参考
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

## 维护提示

- 预设风格文本在 `assets/app.js` 的 `presetData` 中维护  
- API 路由逻辑在 `assets/app.js` 的 `generateImage()`  
- 本地缓存使用 `localStorage`：`apiKey`、`apiUrl`、`model`、`size`

更详细的交接说明请见 `HANDOVER.md`。
