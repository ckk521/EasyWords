# NAS Docker 部署指南

> 适用于群晖 Synology / 威联通 QNAP 等支持 Docker 的 NAS

## 目录结构

```
/volume1/docker/easywords/     # 群晖示例路径
├── docker-compose.yml
├── .env
├── Dockerfile
├── UI/                        # 前端代码
├── server/                    # 后端代码
└── ...
```

---

## 第一步：准备工作

### 1.1 SSH 连接 NAS

```bash
# 群晖默认用户是 admin
ssh admin@你的NAS内网IP

# 创建项目目录
mkdir -p /volume1/docker/easywords
cd /volume1/docker/easywords
```

### 1.2 安装 Docker

- **群晖**: 套件中心 → 搜索 "Container Manager" 或 "Docker" → 安装
- **威联通**: App Center → 搜索 "Container Station" → 安装

---

## 第二步：下载项目代码

### 方式一：Git 克隆（推荐）

```bash
cd /volume1/docker/easywords
git clone https://github.com/ckk521/EasyWords.git .
```

### 方式二：上传压缩包

1. 本地打包项目为 ZIP
2. 上传到 NAS
3. 解压到 `/volume1/docker/easywords`

---

## 第三步：配置环境变量

```bash
cd /volume1/docker/easywords

# 复制环境变量模板
cp .env.example .env

# 编辑配置
vi .env
```

填入你的配置：

```env
DATABASE_URL=libsql://easywords-ckk521.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=你的Turso_Auth_Token
ENCRYPTION_KEY=4157a0e2e7d257950c754f58568c99d6032c40ae6437b474259caf52f8b95c09
CLOUDFLARE_TUNNEL_TOKEN=你的Cloudflare_Tunnel_Token
```

---

## 第四步：启动服务

```bash
cd /volume1/docker/easywords

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

---

## 第五步：配置 Cloudflare Tunnel

### 5.1 创建 Tunnel

1. 登录 [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
2. 左侧菜单 → **Networks** → **Tunnels**
3. 点击 **Create a tunnel**
4. 选择 **Cloudflared**
5. 输入名称（如 `nas-tunnel`）
6. 复制生成的 Token

### 5.2 更新环境变量

```bash
vi /volume1/docker/easywords/.env
# 粘贴 CLOUDFLARE_TUNNEL_TOKEN
```

### 5.3 重启服务

```bash
docker-compose down
docker-compose up -d
```

### 5.4 配置域名

1. Cloudflare Zero Trust → Tunnels → 点击你的 Tunnel
2. **Public Hostname** 标签 → **Add a public hostname**
3. 配置：

| 字段 | 值 |
|------|-----|
| Subdomain | `www` 或留空 |
| Domain | 你的域名 |
| Type | `HTTP` |
| URL | `easywords:3000` |

4. 点击 **Save**

---

## 常用命令

```bash
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f easywords

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新代码并重新部署
git pull
docker-compose up -d --build

# 进入容器
docker exec -it easywords sh
```

---

## 故障排查

### 问题：构建失败 "out of memory"

解决：在 NAS 上增加 Docker 内存限制，或使用预构建镜像。

### 问题：无法连接数据库

检查：
1. `.env` 文件中的 `DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 是否正确
2. NAS 是否能访问外网

### 问题：Cloudflare Tunnel 连接失败

检查：
1. `CLOUDFLARE_TUNNEL_TOKEN` 是否正确
2. cloudflared 容器日志：`docker-compose logs cloudflared`

---

## 仅部署应用（不需要内网穿透）

如果你有公网 IP 或其他内网穿透方案，可以只部署应用：

```bash
# 只启动 easywords 服务
docker-compose up -d easywords
```

然后通过 `http://NAS内网IP:3000` 访问。

---

## 访问地址

配置完成后：

- 外网：`https://你的域名`
- 内网：`http://NAS内网IP:3000`
