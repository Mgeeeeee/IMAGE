<!--
INPUT: 仓库结构与协作规则
OUTPUT: 贡献指南与操作约束
POS: docs 协作规范入口
UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
UPDATED: 2026-01-12
-->
# Repository Guidelines

## 协作要求

- 用中文回复
- 推送 GitHub 前先征询同意

## 文档一致性检查

- 可选执行：`scripts/check_headers.sh`
- 目标：确保文件头部 INPUT/OUTPUT/POS/UPDATE/UPDATED 标记齐全
- 约束：新增/移动/删除文件后，先更新对应 `FOLDER.md` 再提交

## 技术栈要求

### 前端框架

- ❌ 不使用 React
- ❌ 不使用 Vue、Angular 等前端框架
- ✅ 尽可能使用纯 HTML 实现
- ✅ 可以使用原生 JavaScript
- ✅ 可以使用原生 CSS

### 设计原则

- 保持代码简洁，避免过度复杂化
- 优先考虑浏览器原生支持的特性
- 减少外部依赖

## 项目结构与模块组织
本项目保持无构建入口，`index.html` 负责结构，`assets/` 承载样式与脚本。

目录结构以 `docs/README.md` 为唯一权威来源。

## 构建、测试与本地运行
本项目为静态应用，无构建步骤。
- 本地预览（推荐）：`python -m http.server 8080` → `http://localhost:8080`
- 直接打开 `index.html` 也可运行，但 `showSaveFilePicker`、`navigator.share` 仅在 `https` 或 `localhost` 生效。

## 代码风格与命名约定
- 默认在 `assets/styles.css` 与 `assets/app.js` 中修改。
- 缩进：4 空格；使用 LF 行尾。
- CSS 类名用 kebab-case，JS 函数/变量用 camelCase（如 `expandActionCenter`）。
- 不引入外部依赖与前端框架，样式集中在 `assets/styles.css`。

## 测试与验证
当前无测试框架，主要靠手动验证：
- 面板展开/收起动画是否顺滑
- 生成流程（加载动画 → 图片淡入）
- 桌面端下载/移动端分享是否正常
- 模型与比例选择是否正确持久化（localStorage）
- 可选执行 `scripts/check_headers.sh` 验证文件头一致性

## 提交与 PR 规范
- 提交信息倾向简短、动词开头（例如 “Improve loading caption…”）。
- 避免在一个提交中混合无关改动（如 UI 与文档）。
- 如有 PR：需包含变更说明、动画相关截图/录屏、以及配置说明（如模型选择）。

## 架构决策与变更记录
- 架构决策：保持单页入口与无构建部署，降低发布成本。
- 最近变更：移除 docs/meta 并合并日志文档。

## 配置与安全提示
- API Key 存在 `localStorage`，不要在代码中硬编码或日志输出。
- 请求地址来自设置中的 `apiUrl`，默认是 `https://api.tu-zi.com`。
