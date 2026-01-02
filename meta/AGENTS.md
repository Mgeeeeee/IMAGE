<!--
INPUT: 仓库结构与协作规则
OUTPUT: 贡献指南与操作约束
POS: 协作规范入口
UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
UPDATED: 2026-01-02
-->
# Repository Guidelines

## 项目结构与模块组织
本项目保持单文件前端，所有运行逻辑集中于 `index.html`，其余内容为文档与规范。

```
image/
├── .gitignore          # 忽略系统与编辑器噪音文件
├── README.md           # 根目录主文档与规则
├── index.html          # 单页应用入口
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

## 构建、测试与本地运行
本项目为静态应用，无构建步骤。
- 本地预览（推荐）：`python -m http.server 8080` → `http://localhost:8080`
- 直接打开 `index.html` 也可运行，但 `showSaveFilePicker`、`navigator.share` 仅在 `https` 或 `localhost` 生效。

## 代码风格与命名约定
- 默认在 `index.html` 中修改，除非明确需要拆分文件。
- 缩进：4 空格；使用 LF 行尾。
- CSS 类名用 kebab-case，JS 函数/变量用 camelCase（如 `expandActionCenter`）。
- 不引入外部依赖与前端框架，样式优先写在 `<style>` 中。

## 测试与验证
当前无测试框架，主要靠手动验证：
- 面板展开/收起动画是否顺滑
- 生成流程（加载动画 → 图片淡入）
- 桌面端下载/移动端分享是否正常
- 模型与比例选择是否正确持久化（localStorage）

## 提交与 PR 规范
- 提交信息倾向简短、动词开头（例如 “Improve loading caption…”）。
- 避免在一个提交中混合无关改动（如 UI 与文档）。
- 如有 PR：需包含变更说明、动画相关截图/录屏、以及配置说明（如模型选择）。

## 架构决策与变更记录
- 架构决策：保持单文件入口，降低部署与排障成本。
- 最近变更：文档集中到 `docs/`，身份与规范集中到 `meta/`，新增目录索引 `FOLDER.md` 便于维护。

## 配置与安全提示
- API Key 存在 `localStorage`，不要在代码中硬编码或日志输出。
- 请求地址来自设置中的 `apiUrl`，默认是 `https://api.tu-zi.com`。
