# Zeabur 部署指南

> 使用香港节点，国内访问更快

## 第一步：注册 Zeabur

1. 访问 [https://zeabur.com](https://zeabur.com)
2. 点击 **Login with GitHub** 用 GitHub 登录
3. 授权 Zeabur 访问你的仓库

## 第二步：创建项目

1. 点击 **New Project**
2. 选择区域：**Hong Kong (香港)** 或 **Singapore (新加坡)**
3. 项目命名：`easywords`

## 第三步：部署服务

1. 在项目中点击 **Add Service**
2. 选择 **Git**
3. 选择你的 `EasyWords` 仓库
4. Zeabur 会自动检测 Dockerfile 并开始构建

## 第四步：配置环境变量

部署完成后，添加环境变量：

1. 点击服务 → **Variables** 标签
2. 添加以下变量：

| 名称 | 值 |
|------|-----|
| `DATABASE_URL` | `libsql://easywords-ckk521.aws-ap-northeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | *(你之前的 Turso token)* |
| `ENCRYPTION_KEY` | `4157a0e2e7d257950c754f58568c99d6032c40ae6437b474259caf52f8b95c09` |

3. 点击 **Save**，服务会自动重新部署

## 第五步：绑定域名

1. 点击 **Domains** 标签
2. 点击 **Generate Domain** 生成免费域名
3. 或绑定自定义域名

## 完成！

访问分配的域名，如 `easywords.xxx.zeabur.app`

---

## 常见问题

### Q: 构建失败 "out of memory"
免费版内存有限，可能需要优化构建。可以在 Zeabur 设置中增加构建内存。

### Q: 访问慢/冷启动
Zeabur 免费版会休眠，首次访问需要 3-5 秒唤醒。可以升级付费版保持常驻。

### Q: 数据库连接失败
检查 `DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 是否正确配置。

---

## 对比

| 平台 | 节点 | 访问速度 | 休眠 |
|------|------|----------|------|
| Vercel | 美国 | ~2s | 无 |
| Zeabur 免费版 | 香港 | ~200ms | 有 (3-5s 唤醒) |
| Zeabur 付费版 | 香港 | ~200ms | 无 |

---

## 费用说明

| 方案 | 价格 | 配置 |
|------|------|------|
| 免费版 | $0/月 | 512MB 内存，可能休眠 |
| 付费版 | $5/月起 | 更多资源，不休眠 |
