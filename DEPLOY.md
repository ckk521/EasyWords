# EasyWords 部署指南

> 使用 Vercel + Turso 免费部署到公网

## 前置要求

- GitHub 账号
- Vercel 账号（可用 GitHub 登录）
- Turso 账号（免费注册）

---

## 第一步：准备 Turso 数据库

### 1.1 注册 Turso

访问 [https://turso.tech](https://turso.tech) 注册账号（可用 GitHub 登录）

### 1.2 安装 Turso CLI

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
irm https://get.tur.so/install.ps1 | iex

# 或使用 npm
npm install -g tursodb
```

### 1.3 登录并创建数据库

```bash
# 登录 Turso
turso auth login

# 创建数据库
turso db create easywords

# 查看数据库信息
turso db show easywords
```

### 1.4 获取数据库连接信息

```bash
# 获取数据库 URL
turso db show easywords --url

# 创建访问令牌
turso auth token create -e "never"
```

记录以下信息：
- `DATABASE_URL`: 类似 `libsql://easywords-xxx.turso.io`
- `TURSO_AUTH_TOKEN`: 一长串令牌

---

## 第二步：准备 GitHub 仓库

### 2.1 推送代码到 GitHub

```bash
# 在项目根目录
git add .
git commit -m "feat: 添加 Vercel + Turso 部署配置"
git push origin main
```

---

## 第三步：部署到 Vercel

### 3.1 导入项目

1. 访问 [https://vercel.com](https://vercel.com)
2. 点击 **Add New...** → **Project**
3. 选择你的 GitHub 仓库
4. **Root Directory** 设置为 `server`

### 3.2 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 名称 | 值 | 说明 |
|------|-----|------|
| `DATABASE_URL` | `libsql://easywords-xxx.turso.io` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | `your-auth-token` | Turso 访问令牌 |
| `ENCRYPTION_KEY` | `生成一个32字节的hex字符串` | API Key 加密密钥 |

生成加密密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 部署

点击 **Deploy**，等待部署完成。

---

## 第四步：初始化数据库

部署成功后，需要初始化数据库表结构。

### 方法一：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目
cd server
vercel link

# 执行数据库迁移
vercel env pull .env
npx prisma migrate deploy
```

### 方法二：本地连接 Turso 执行迁移

```bash
# 在 server 目录
cd server

# 设置环境变量
export DATABASE_URL="libsql://easywords-xxx.turso.io"
export TURSO_AUTH_TOKEN="your-auth-token"

# 执行迁移
npx prisma migrate deploy
```

---

## 部署完成

访问 Vercel 分配的域名，例如：
- `https://easywords.vercel.app`
- `https://easywords-xxx.vercel.app`

### 自定义域名（可选）

在 Vercel 项目设置 → Domains 中添加自定义域名。

---

## 常见问题

### Q: 数据库连接失败

检查：
1. `DATABASE_URL` 格式是否正确（`libsql://` 开头）
2. `TURSO_AUTH_TOKEN` 是否有效
3. Turso 数据库是否在运行

### Q: 前端页面空白

检查：
1. 前端是否正确构建（查看 Vercel 构建日志）
2. `public/index.html` 是否存在

### Q: API 请求失败

检查：
1. Vercel 函数日志（项目 → Logs）
2. 环境变量是否正确设置

---

## 本地测试生产配置

```bash
# 在 server 目录
cd server

# 设置环境变量
export DATABASE_URL="libsql://easywords-xxx.turso.io"
export TURSO_AUTH_TOKEN="your-auth-token"
export ENCRYPTION_KEY="your-encryption-key"
export NODE_ENV="production"

# 构建
pnpm build

# 启动
pnpm start
```

---

## 成本说明

| 服务 | 免费额度 | 说明 |
|------|----------|------|
| Vercel | 100GB 带宽/月 | 个人项目足够 |
| Turso | 9GB 存储 + 10亿行读取/月 | 完全够用 |

**总计：免费**
