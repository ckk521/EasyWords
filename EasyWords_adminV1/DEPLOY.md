# EasyWords Admin V1 部署指南

> 版本：V1.1
> 更新日期：2026-03-20
> 参考 skill: NAS绿联部署, deployment-patterns, docker-patterns

---

## ⚠️ 重要提醒：数据清理规则

> **部署清理数据时，务必保留 `docs/` 目录！**

| 目录/文件 | 说明 | 清理规则 |
|-----------|------|----------|
| `docs/` | 需求文档（PRD、实施计划等） | ❌ **禁止清理** |
| `*.md` | 项目说明文件 | ❌ **不清理** |
| `node_modules/` | 依赖包 | ✅ 可清理 |
| `dist/` | 构建产物 | ✅ 可清理 |
| `.git/` | Git 历史 | ✅ 可清理（部署前） |
| `.next/` | 构建缓存 | ✅ 可清理 |
| `__pycache__/` | Python 缓存 | ✅ 可清理 |
| `.claude/` | Claude 配置 | ✅ 可清理 |

**原因**: `docs/` 目录包含项目需求文档，是项目的重要参考资料，删除后无法恢复。

---

## 一、部署前准备

### 1.1 必须清理的文件/目录

**重要：部署前必须清理以下文件，否则上传会非常慢！**

```bash
# 进入项目目录
cd EasyWords_adminV1

# 删除不需要的文件
rm -rf node_modules dist .cache .git .next __pycache__ .claude
rm -f *.tar.gz

# 检查项目大小（应该只有几MB）
du -sh .
```

### 1.2 环境要求

- Node.js >= 18.x
- pnpm >= 8.x（推荐）或 npm
- 数据库：PostgreSQL / MySQL（根据后端配置）

### 1.3 配置检查

- [ ] 环境变量配置正确（.env 文件）
- [ ] 数据库连接字符串正确
- [ ] JWT 密钥已设置
- [ ] 管理员账号密码已修改（默认：ckk521/123456）

---

## 二、NAS Docker 部署（绿联 NAS）

### 2.1 SSH 连接信息

```
SSH地址: ssh ckk@192.168.1.3 -p 24
密码: Ckk@5276241
项目路径: /volume1/docker/IT/
```

### 2.2 部署脚本（Python + Paramiko）

```python
import paramiko
import os
import base64

# 配置
host = '192.168.1.3'
port = 24
username = 'ckk'
password = 'Ckk@5276241'
sudo_pwd = 'Ckk@5276241'
remote_base = '/volume1/docker/IT/EasyWords_adminV1'
local_path = '.'

# ⚠️ 跳过的目录（重要：docs 不在跳过列表中，会被保留）
skip_items = {'node_modules', '.git', '.next', '__pycache__', '.claude', 'dist'}

# 连接
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port, username, password)

# 清理旧文件
ssh.exec_command(f'rm -rf {remote_base}')[1].read()
ssh.exec_command(f'mkdir -p {remote_base}')[1].read()

# 收集文件
all_files, all_dirs = [], []
for root, dirs, files in os.walk(local_path):
    dirs[:] = [d for d in dirs if d not in skip_items]
    rel_dir = os.path.relpath(root, local_path)
    remote_dir = remote_base if rel_dir == '.' else remote_base + '/' + rel_dir.replace('\\', '/')
    if rel_dir != '.': all_dirs.append(remote_dir)
    for f in files:
        if f not in skip_items and not f.endswith('.tar.gz'):
            all_files.append((os.path.join(root, f), remote_dir + '/' + f))

# 创建目录
ssh.exec_command('mkdir -p ' + ' '.join([f"'{d}'" for d in all_dirs]))[1].read()

# 上传文件
for local_file, remote_file in all_files:
    b64 = base64.b64encode(open(local_file, 'rb').read()).decode()
    ssh.exec_command(f"> '{remote_file}'")[1].read()
    for i in range(0, len(b64), 7000):
        ssh.exec_command(f"echo -n '{b64[i:i+7000]}' >> '{remote_file}'")[1].read()
    ssh.exec_command(f"base64 -d '{remote_file}' > '{remote_file}.tmp' && mv '{remote_file}.tmp' '{remote_file}'")[1].read()

# Docker 操作
ssh.exec_command(f"echo '{sudo_pwd}' | sudo -S docker compose down 2>&1")[1].read()
ssh.exec_command(f"cd {remote_base} && echo '{sudo_pwd}' | sudo -S docker compose up -d --build 2>&1")[1].read()

ssh.close()
```

### 2.3 验证部署

```bash
# 检查容器状态
docker ps -a

# 测试 API
curl -s http://localhost:端口/health

# 查看日志
docker logs 容器名 --tail 50
```

---

## 三、生产环境部署

### 3.1 Nginx 配置示例

```nginx
server {
    listen 80;
    server_name admin.easywords.com;

    root /var/www/easywords-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3.2 HTTPS 配置

```bash
sudo certbot --nginx -d admin.easywords.com
```

### 3.3 Docker 多阶段构建（推荐）

```dockerfile
# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# Stage 3: Production image
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## 四、数据迁移策略

### 4.1 现有数据处理

| 数据 | 处理方式 |
|------|----------|
| 现有单词/文章等 | 关联到默认管理员账号（ckk521）用于测试 |
| 新部署 | 可选择清空测试数据，全新开始 |

### 4.2 数据库备份

```bash
# 备份
pg_dump easywords > backup_$(date +%Y%m%d).sql

# 恢复
psql easywords < backup_20260320.sql
```

---

## 五、常见问题

### Q1: 容器名冲突

```
Error: The container name "/xxx" is already in use
```

解决：`docker rm -f 容器名`

### Q2: 权限不足

```
permission denied while trying to connect to the Docker daemon socket
```

解决：使用 `sudo -S` 并通过管道输入密码

### Q3: 上传太慢

原因：没有清理 `node_modules` 等大文件

解决：部署前必须执行清理操作

### Q4: 登录失败

- 检查管理员账号是否存在
- 检查密码是否正确
- 检查数据库连接

---

## 六、快速命令参考

```bash
# 查看容器状态
docker ps -a

# 查看容器日志
docker logs 容器名 --tail 100

# 进入容器
docker exec -it 容器名 sh

# 重启容器
docker restart 容器名

# 停止所有容器
docker compose down

# 重新构建并启动
docker compose up -d --build
```

---

## 七、联系与支持

- 项目文档：`docs/` 目录
- PRD 文档：[docs/PRD_B端.md](docs/PRD_B端.md)
- 实施计划：[docs/B端实施计划.md](docs/B端实施计划.md)
