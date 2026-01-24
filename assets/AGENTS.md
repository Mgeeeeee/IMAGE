<!--
INPUT: assets/ 目录与成员信息
OUTPUT: assets 模块地图与职责清单
POS: assets/ 局部架构文档
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
UPDATED: 2026-01-24
-->
# assets/
> L2 | 父级: /AGENTS.md

成员清单
1.png: 视觉参考，静态示意图。
styles.css: 样式入口，全站视觉与布局。
app.js: 交互与生成流程入口，编排 UI 与请求。
prompt-utils.js: 提示词清洗工具，去除空白段与不可见字符。
image-api.js: 生图请求构建与响应解析。
storage.js: 本地缓存读写，管理配置持久化。
ui-state.js: UI 状态管理，控制面板与加载等视图。
generation.js: 生成编排，协调输入与请求流程。
favicon.svg: 站点图标，标签页/收藏展示。
apple-touch-icon.png: 触控图标，移动端桌面入口。
svgviewer-png-output.png: 视觉参考，本地图标导出物。
FOLDER.md: 目录索引，列出 assets 内容与职责。
AGENTS.md: 模块地图，定义成员与职责边界。

法则: 成员完整·一行一文件·父级链接·技术词前置

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
