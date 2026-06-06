# CloudBase 静态托管 + 云函数部署指南

这份指南用于把「拾页手帐」部署成可分享链接的线上网页，并支持手机相册上传照片生成手账。

## 架构

```
手机浏览器
  ↓
CloudBase 静态托管：dist/
  ↓
CloudBase 匿名登录
  ├─ 云存储：上传手机相册照片，返回临时图片 URL
  ├─ 云函数 generateImage：服务端持有 API Key，代理调用图像模型
  └─ 数据库：保存手帐本、页面、模板、用户设置
```

生产构建默认启用：

- `VITE_USE_CLOUDBASE_MODEL_PROXY=true`：生成图片走 `generateImage` 云函数
- `VITE_UPLOAD_PROVIDER=cloudbase`：用户照片走 CloudBase 云存储
- `VITE_CLOUDBASE_AVAILABLE_MODELS`：可选，用逗号限制线上展示的模型

本地 `npm run dev` 默认保留原来的 Vite 代理与 COS 上传，便于继续调试。

## 一、我已经准备好的代码

- `cloudfunctions/generateImage/`：图像生成云函数
- `src/lib/modelRouter.ts`：生产环境自动走 CloudBase 云函数代理
- `src/lib/cosUploader.ts`：生产环境自动上传到 CloudBase 云存储
- `src/lib/deploymentMode.ts`：部署模式开关

## 二、你需要在 CloudBase 控制台操作

### 1. 确认环境

进入 CloudBase 控制台：

```text
https://console.cloud.tencent.com/tcb
```

选择项目当前使用的环境：

```text
my-travel-journal-d5d06m1a517f14
```

如果你想换成新环境，需要同步修改 `src/lib/cloudbase.ts` 里的 `ENV_ID`。

### 2. 启用登录方式

进入：

```text
身份认证 → 登录方式
```

开启：

```text
匿名登录
```

项目启动时会自动匿名登录，这样手机用户不用注册也能上传和生成。

### 3. 开通云存储

进入：

```text
云存储
```

如果还没开通，点击开通即可。

建议创建目录：

```text
journal/
```

前端会把手机照片上传到类似：

```text
journal/20260606/<uuid>.jpg
```

### 4. 创建数据库集合

进入：

```text
数据库 → 集合
```

至少创建这些集合：

```text
journals_notebooks
journals_pages
journal_templates
user_settings
```

安全规则建议：

```json
{
  "read": "auth.uid != null",
  "write": "auth.uid != null"
}
```

更严格版本可以按已有文档 `CLOUDBASE_SETUP.md` 配成只读写自己的 `uid/userId`。

### 5. 创建并部署云函数 `generateImage`

进入：

```text
云函数 → 新建云函数
```

配置：

```text
函数名：generateImage
运行环境：Node.js 18 或更新版本
内存：512 MB 起
超时时间：300 秒
```

代码目录使用本仓库：

```text
cloudfunctions/generateImage
```

如果控制台支持上传目录，直接上传这个目录；如果用 CLI，可在本地执行：

```bash
cd /Users/kaihe.jing/Developer/Travel-journal/cloudfunctions/generateImage
tcb fn deploy generateImage --dir .
```

### 6. 配置云函数环境变量

在 `generateImage` 云函数的「环境变量」里按你要启用的模型填写：

```bash
# FLUX.2 Pro
REPLICATE_API_TOKEN=你的 Replicate token

# GPT-2 / Kratos，可选
KRATOS_API_TOKEN=你的 Kratos token
KRATOS_ACTION_URL=http://kratos-sunyihao.sl.beta.xiaohongshu.com/ads/materialcenter/doaction

# QS GPT Image 2，可选
QS_GPT_IMAGE_2_API_KEY=你的 QS token
MAAS_BACKEND=https://maas.devops.xiaohongshu.com

# V-API，可选，两个 V-API 模型可共用
V_API_KEY=你的 V-API key
V_API_ENDPOINT=https://api.v3.cm/v1/images/edits
```

当前应用默认选择 `V-API GPT Image 2`。

如果你已经在另一个云函数 `getVApiKey` 里配置了 `V_API_KEY`，可以先不在 `generateImage` 重复配置；前端会在用户没有填写任何 Key 时调用 `getVApiKey`，再把 Key 交给 `generateImage` 发起生成请求。

更推荐的正式生产做法：把同一个 `V_API_KEY` 也配置到 `generateImage` 云函数环境变量里。这样 API Key 不需要回到浏览器，安全性更好。

默认不需要创建 `.env.production`。线上会展示全部模型按钮：

- `v-api-gpt-image-2`、`v-api-seedream-4-5`：默认可点，因为会走 `getVApiKey` / `V_API_KEY`；
- 其他模型：只有用户在 API 配置面板填了 Key，或构建环境里有对应 `VITE_*` Key 时才可点，否则置灰。

如果你想临时隐藏某些模型，再创建 `.env.production` 限制线上模型下拉：

```bash
VITE_CLOUDBASE_AVAILABLE_MODELS=v-api-gpt-image-2
```

多个模型用英文逗号分隔：

```bash
VITE_CLOUDBASE_AVAILABLE_MODELS=v-api-gpt-image-2,v-api-seedream-4-5
```

### 7. 部署静态网站

本地构建：

```bash
cd /Users/kaihe.jing/Developer/Travel-journal
npm install
npm run build
```

然后进入 CloudBase 控制台：

```text
静态网站托管 → 上传文件
```

上传 `dist/` 目录里的全部文件。

如果控制台支持 CLI，也可以使用：

```bash
tcb hosting deploy dist -e my-travel-journal-d5d06m1a517f14
```

### 8. 配置静态托管访问域名

进入：

```text
静态网站托管 → 域名管理
```

先用 CloudBase 默认域名测试；确认可用后再绑定自定义域名。

手机打开默认域名即可从相册选图生成手账。

## 三、上线后验证清单

1. 手机浏览器打开 CloudBase 静态托管链接。
2. 点击上传区域，确认能打开手机相册并多选图片。
3. 上传后打开浏览器控制台或 CloudBase 云存储，确认出现 `journal/日期/uuid` 文件。
4. 点击生成，确认 CloudBase 云函数 `generateImage` 有调用日志。
5. 生成成功后，确认页面能展示生成图并导出 PNG。
6. 点击「我的手帐本」，确认 CloudBase 数据库集合里有记录。

## 四、常见问题

### 生成失败：`V_API_KEY 未在 CloudBase 云函数环境变量中配置`

如果你走推荐生产做法，说明 `generateImage` 云函数里还没配置 `V_API_KEY`，或配完没有重新部署/重启云函数。

如果你想复用已有 `getVApiKey` 云函数，请确认：

- `getVApiKey` 云函数已部署；
- `getVApiKey` 云函数环境变量里有 `V_API_KEY`；
- 前端匿名登录能正常调用 `getVApiKey`。

### 上传失败：`CloudBase 云存储未返回临时访问链接`

检查云存储是否开通，匿名登录是否开启，静态网站域名是否被 CloudBase SDK 允许访问。

### 本地也想测试 CloudBase 路径

创建 `.env.local`：

```bash
VITE_USE_CLOUDBASE_MODEL_PROXY=true
VITE_UPLOAD_PROVIDER=cloudbase
```

然后运行：

```bash
npm run dev
```

### 想临时回到旧的 COS 上传

创建 `.env.local`：

```bash
VITE_UPLOAD_PROVIDER=cos
```

生产环境不建议长期使用匿名写 COS。
