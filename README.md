# AI 图片生成器

一个简洁优雅的 AI 图片生成网页应用，支持文生图和图生图功能。

## 功能特点

- **文生图**: 通过提示词直接生成图片
- **图生图**: 上传参考图片进行图片编辑和变换
- **动态模型列表**: 自动从 API 厂商获取所有可用模型，无需手动配置
- **智能分类**: 自动将模型按类别分组（Google、Flux、DALL-E 等）
- **多模型支持**: 支持所有厂商提供的图片生成模型
- **余额查询**: 实时显示账户余额，随时掌握账户状态
- **费用预估**: 根据模型和尺寸自动估算单次生图费用
- **自动刷新**: 生成完成后自动更新余额信息
- **自定义 API**: 使用自己的 API Key，支付自己的使用费用
- **响应式设计**: 美观的渐变色界面，支持移动端
- **本地存储**: 自动保存 API 配置，无需重复输入

## 支持的模型

应用会自动从 API 厂商获取所有可用模型，并按以下类别智能分组：

### 自动分类
- **Google 系列**: nano-banana, imagen-3.0-generate-001 等
- **Flux 系列**: flux-1.1-pro, flux-pro, flux-dev 等
- **DALL-E 系列**: dall-e-3, gpt-image-1.5 等
- **Midjourney 系列**: midjourney 相关模型
- **Stable Diffusion 系列**: SD, SDXL 相关模型
- **其他图片生成模型**: ideogram, kling, sora, pika, runway 等

### 推荐模型（自动标记）
系统会自动识别并标记以下推荐模型：
- nano-banana (推荐)
- imagen-3.0-generate-001 (推荐)
- flux-1.1-pro (推荐)
- dall-e-3 (推荐)
- gpt-image-1.5 (推荐)

## 使用方法

### 1. 配置 API 并连接

点击右上角的"设置"按钮，按以下步骤操作：

#### 步骤 1: 输入 API Key
- 在 [tu-zi.com](https://api.tu-zi.com) 获取你的 API Key
- 将 API Key 粘贴到"API Key"输入框中
- API 地址默认为 `https://api.tu-zi.com`，一般无需修改

#### 步骤 2: 查看账户信息
- 输入 API Key 后，系统会**自动显示账户余额信息**
- 账户信息卡片显示：
  - **账户余额**: 当前可用余额（美元）
  - **预估单次费用**: 根据所选模型和尺寸计算的单次生图费用
  - **剩余可生成次数**: 根据余额和单次费用计算
- 点击"刷新"按钮可手动更新余额信息

#### 步骤 3: 自动获取模型列表
- 系统会**自动连接厂商并获取所有可用模型**
- 等待几秒钟，模型列表会自动填充到下拉框中
- 你也可以点击"模型选择"旁边的 🔄 刷新按钮手动刷新模型列表

#### 步骤 4: 选择模型和尺寸
- 从下拉列表中选择你想使用的图片生成模型
- 推荐模型会自动标记 "(推荐)" 字样
- 选择生成图片的尺寸（正方形、竖版或横版）
- **费用会根据所选模型和尺寸自动更新**

**提示**: 所有配置会自动保存在浏览器本地存储中，下次打开无需重新配置。

### 2. 生成图片

#### 文生图（纯提示词）
1. 在底部输入框中输入你的提示词
2. 点击"生成"按钮或按 Enter 键
3. 等待图片生成完成，生成的图片会显示在上方画廊中

#### 图生图（带参考图片）
1. 点击输入框右侧的图片图标上传参考图片
2. 输入你的提示词（描述如何修改图片）
3. 点击"生成"按钮
4. 等待图片生成完成

### 3. 费用管理

#### 实时余额监控
- 打开设置面板即可查看账户余额
- 余额信息会在以下情况自动更新：
  - 首次输入 API Key
  - 每次生成图片完成后（延迟 1 秒）
  - 点击"刷新"按钮

#### 费用估算说明
系统会根据所选模型和图片尺寸自动估算费用。费用估算基于常见市场价格：

**Google 系列**:
- nano-banana: ~$0.008/张 (1024x1024)
- imagen-3.0: ~$0.04/张

**Flux 系列**:
- flux-1.1-pro: ~$0.04/张
- flux-pro: ~$0.055/张
- flux-dev: ~$0.025/张

**DALL-E 系列**:
- dall-e-3: $0.04/张 (1024x1024), $0.08/张 (高分辨率)

**其他模型**:
- midjourney: ~$0.05/张
- stable-diffusion: ~$0.015/张

**注意**:
- 以上价格为参考估算，实际费用以 API 厂商计费为准
- 更大的图片尺寸（如 1024x1792）费用通常为基础价格的 1.5 倍

### 4. 快捷操作

- **Enter**: 发送提示词生成图片
- **Shift + Enter**: 在提示词中换行
- **点击 × 按钮**: 移除已上传的参考图片
- **点击 🔄 按钮**: 刷新可用模型列表
- **点击"刷新"按钮**: 更新账户余额信息

## 技术实现

### 动态模型获取

应用启动时会自动调用 API 获取可用模型列表：

```javascript
GET /v1/models
Authorization: Bearer YOUR_API_KEY

// 响应格式
{
  "data": [
    {
      "id": "nano-banana",
      "object": "model",
      "created": 1234567890,
      "owned_by": "google"
    },
    // ... 更多模型
  ]
}
```

#### 智能分类算法

系统根据模型 ID 自动分类：
- 包含 `nano`、`banana`、`imagen` → Google 系列
- 包含 `flux` → Flux 系列
- 包含 `dall-e`、`gpt-image` → DALL-E 系列
- 包含 `midjourney`、`mj` → Midjourney 系列
- 包含 `stable`、`sd-`、`sdxl` → Stable Diffusion 系列
- 包含 `image`、`ideogram`、`kling`、`sora`、`pika`、`runway` → 其他图片生成模型

#### 备用机制

如果 API 获取失败（网络问题、权限问题等），系统会自动加载内置的默认模型列表，确保基本功能可用。

### API 适配

根据不同模型使用不同的 API 接口格式：

#### Google nano-banana - Chat 格式（推荐）
```javascript
POST /v1/chat/completions
{
  "model": "nano-banana",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "your prompt"},
        {"type": "image_url", "image_url": {"url": "base64..."}} // 可选，支持图生图
      ]
    }
  ],
  "size": "1024x1024"
}

// 响应格式
{
  "choices": [
    {
      "message": {
        "content": "https://image-url.com/generated.png" // 或 markdown 格式
      }
    }
  ]
}
```

#### Flux 系列 - Chat 格式
```javascript
POST /v1/chat/completions
{
  "model": "flux-1.1-pro",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "your prompt"},
        {"type": "image_url", "image_url": {"url": "base64..."}} // 可选
      ]
    }
  ],
  "size": "1024x1024"
}
```

#### DALL-E 系列 - Image Generations 格式
```javascript
POST /v1/images/generations
{
  "model": "dall-e-3",
  "prompt": "your prompt",
  "n": 1,
  "size": "1024x1024"
}

// 或图片编辑
POST /v1/images/edits
FormData {
  image: File,
  prompt: "your prompt",
  model: "dall-e-3",
  size: "1024x1024"
}
```

#### Midjourney - 任务提交格式
```javascript
// 1. 提交任务
POST /mj/submit/imagine
{
  "prompt": "your prompt",
  "base64Array": ["base64..."] // 可选
}

// 2. 查询结果
GET /mj/task/{taskId}/fetch
```

#### 可灵 - Kling 格式
```javascript
// 1. 创建任务
POST /kling/v1/images/generations
{
  "prompt": "your prompt",
  "image": "base64...", // 可选
  "model": "kling-image"
}

// 2. 查询结果
GET /kling/v1/images/generations/{taskId}
```

### 文件结构

```
image/
├── index.html          # 单页面应用（包含 HTML、CSS、JavaScript）
├── README.md          # 说明文档
└── llms.txt          # API 文档参考
```

## 浏览器兼容性

- Chrome / Edge (推荐)
- Firefox
- Safari
- 现代移动浏览器

## nano-banana 模型特点

### 优势
- **高质量**: Google 最新的图片生成模型，生成质量高
- **速度快**: 相比其他模型，生成速度较快（通常 5-15 秒）
- **支持图生图**: 可以上传参考图片进行图片编辑和风格转换
- **成本优化**: 相对于其他高质量模型，性价比较高

### 使用建议
- **提示词**: 支持中英文提示词，但英文效果通常更好
- **参考图片**: 上传参考图片时，会根据图片内容和提示词生成新图片
- **尺寸选择**: 支持多种尺寸，推荐使用 1024x1024 获得最佳效果

## 注意事项

1. **API Key 安全**:
   - API Key 存储在浏览器本地，不会上传到任何服务器
   - 请勿在公共计算机上保存 API Key
   - 定期更换 API Key 以保证安全

2. **图片生成时间**:
   - 不同模型生成速度不同
   - Flux 系列通常较快（几秒到十几秒）
   - Midjourney 可能需要 30 秒到 1 分钟
   - 可灵等模型可能需要更长时间

3. **费用说明**:
   - 本应用使用你自己的 API Key
   - 生成图片会消耗你账户中的额度
   - 不同模型价格不同，请查看 tu-zi.com 的定价说明

4. **图片质量**:
   - 建议使用英文提示词以获得最佳效果
   - 提示词越详细，生成效果越好
   - 可以包含风格描述、场景描述、光照描述等

## 提示词技巧

### 好的提示词示例

```
A serene landscape of mountains at sunset, golden hour lighting,
cinematic composition, highly detailed, 8k resolution, professional photography
```

### 提示词构成要素

1. **主体描述**: 你想生成什么（人物、物体、场景等）
2. **风格描述**: 艺术风格、画风（realistic, anime, oil painting 等）
3. **细节描述**: 颜色、光照、构图等具体细节
4. **质量词**: 高质量、高分辨率等提升质量的关键词

## 故障排除

### 生成失败
- 检查 API Key 是否正确
- 检查网络连接
- 确认账户余额充足
- 尝试更换模型

### 图片无法显示
- 检查浏览器控制台是否有错误
- 确认返回的图片 URL 可访问
- 尝试刷新页面

### 参考图片上传失败
- 确认图片格式正确（JPG、PNG、GIF、WebP）
- 检查图片大小（建议小于 10MB）
- 尝试压缩图片后重新上传

## 开发相关

这是一个纯前端应用，所有代码都包含在 `index.html` 文件中：

- **HTML**: 页面结构
- **CSS**: 样式设计（内嵌在 `<style>` 标签中）
- **JavaScript**: 业务逻辑（内嵌在 `<script>` 标签中）

如需修改或扩展功能，直接编辑 `index.html` 文件即可。

### 添加新模型支持

在 `index.html` 中找到模型选择部分，添加新的选项：

```html
<select id="modelSelect">
  <!-- 添加新模型 -->
  <option value="your-model">Your Model Name</option>
</select>
```

然后在 `generateImage()` 函数中添加对应的 API 调用逻辑。

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过 [tu-zi.com](https://api.tu-zi.com) 联系技术支持。
