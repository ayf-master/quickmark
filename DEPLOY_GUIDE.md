# QuickMark 服务器部署全流程

> 本文档记录了从零开始在腾讯云服务器上部署 QuickMark 的完整过程，供学习参考。

---

## 第一章：SSH 连接服务器

### 1.1 什么是 SSH？

SSH（Secure Shell）是一种加密网络协议，用于安全地远程登录服务器。相当于给你一把钥匙（密钥文件），远程打开服务器的"门"。

### 1.2 准备工作

需要三样东西：
- **服务器 IP 地址**：`118.89.199.84`
- **密钥文件**：`ayf.pem`（私钥，相当于钥匙）
- **用户名**：`ubuntu`（腾讯云默认用户名）

### 1.3 首次连接

```powershell
ssh -i C:\Users\33512\Desktop\ayf.pem ubuntu@118.89.199.84
```

参数说明：
- `-i`：指定私钥文件
- `ubuntu`：服务器上的用户名
- `@118.89.199.84`：服务器 IP

### 1.4 常见问题

**Q: 密钥文件格式不被识别？**
A: OpenSSH 新版可能不识别旧格式的 RSA 密钥，需要转换：
```powershell
ssh-keygen -p -N "" -f C:\Users\33512\Desktop\ayf.pem -m pem
```

**Q: 报错 "bad permissions"？**
A: Windows 要求私钥文件只能被当前用户访问：
```powershell
icacls C:\Users\33512\Desktop\ayf.pem /reset
icacls C:\Users\33512\Desktop\ayf.pem /inheritance:r
icacls C:\Users\33512\Desktop\ayf.pem /grant "$env:USERNAME:R"
```

**Q: 连不上但没报错？**
A: 可能密钥没在服务器上注册。腾讯云要去控制台 → SSH 密钥 → 绑定密钥到实例。

### 1.5 SSH 配置简化

可以在本地 `~/.ssh/config` 文件里配好快捷方式：

```
Host quickmark
  HostName 118.89.199.84
  User ubuntu
  IdentityFile C:\Users\33512\Desktop\ayf.pem
```

之后直接 `ssh quickmark` 就能连，不用输 IP 和密钥路径。

---

## 第二章：服务器环境检查

连接上服务器后，先看看有什么工具可用：

```bash
# 系统信息
uname -a                          # 查看内核版本
cat /etc/os-release               # 查看系统版本（Ubuntu 20.04）

# Docker
docker --version                  # Docker 版本
docker compose version            # Docker Compose 版本

# 硬件
free -h                           # 内存使用情况
df -h /                           # 磁盘使用情况
```

我们服务器的情况：
- **系统**：Ubuntu 20.04 LTS
- **Docker**：26.1.3 ✅ 已装
- **Docker Compose**：v2.35.1 ✅ 已装
- **Node.js**：未装（后面装）

---

## 第三章：上传项目文件

### 3.1 打包项目（排除不需要的文件）

```bash
# 在本地电脑上执行
cd D:/vibeCoding/quickmark
tar -czf /tmp/quickmark.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=uploads \
  .
```

### 3.2 上传到服务器

SCP（Secure Copy）命令，基于 SSH 加密传输：

```bash
scp -i C:\Users\33512\Desktop\ayf.pem /tmp/quickmark.tar.gz ubuntu@118.89.199.84:/home/ubuntu/
```

### 3.3 在服务器上解压

```bash
ssh -i C:\Users\33512\Desktop\ayf.pem ubuntu@118.89.199.84
cd /home/ubuntu
mkdir quickmark
cd quickmark
tar xzf /home/ubuntu/quickmark.tar.gz
```

---

## 第四章：安装 Node.js 并启动应用

### 4.1 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # 验证安装
npm --version
```

### 4.2 配置环境变量

项目根目录下创建 `.env` 文件，配置数据库连接和密钥：

```bash
cd /home/ubuntu/quickmark
cat > .env << 'EOF'
PORT=3000
USE_PRISMA=1
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=quickmark
DATABASE_URL=mysql://root:你的数据库密码@localhost:3306/quickmark
JWT_SECRET=你的JWT密钥
REDIS_URL=redis://localhost:6379
ALLOW_REGISTER=1
EOF
```

注意：这里的 `DB_HOST=localhost` 是因为 MySQL 跑在 Docker 里但映射到了本机 3306 端口。如果应用也在 Docker 里跑，就要写成 `DB_HOST=db`（Docker 服务名）。

### 4.3 安装依赖并构建

```bash
# 使用国内镜像加速
npm config set registry https://registry.npmmirror.com

# 安装依赖（会自动执行 prisma generate）
npm install

# 构建前端（Vite 打包）
npm run build
```

### 4.4 启动应用

临时启动（调试用）：
```bash
node server.js
```

后台启动（不推荐，挂了没人管）：
```bash
nohup node server.js > /tmp/quickmark.log 2>&1 &
```

---

## 第五章：Docker 跑 MySQL 和 Redis

### 5.1 为什么用 Docker 跑数据库？

传统方式要在服务器上手动安装 MySQL、Redis，配置繁琐。用 Docker：
- **一行命令启动**，不用操心安装过程
- **环境隔离**，不影响系统其他软件
- **版本管理**，升级回退都很简单

### 5.2 Docker Compose 配置

项目根目录的 `docker-compose.yml` 定义了三个服务：

```yaml
services:
  db:        # MySQL 8.0 数据库
    image: mysql:8.0
    ports:
      - "127.0.0.1:3306:3306"   # 只监听本机，外网扫不到
  
  redis:     # Redis 7 缓存
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"   # 只监听本机

  app:       # 应用本身（没用这个，直接 Node.js 跑的）
    build: .
    ports:
      - "3000:3000"
```

关键理解：`127.0.0.1:3306:3306` 的意思是：
- 左边 `127.0.0.1:3306`：宿主机上只监听本机地址
- 右边 `3306`：容器内部端口
- 效果：只有本机（或者通过 SSH 隧道）能连数据库，外网扫不到 3306 端口

### 5.3 为什么 App 不用 Docker 跑？

Docker 构建 `node:20-bookworm-slim` 镜像 + 安装 npm 依赖 + 构建前端，整个过程要**好几分钟**。直接在服务器上装 Node.js 原生跑，**几十秒搞定**。对于一台低配服务器，原生运行也更省资源。

这叫 **混合部署**：数据库用 Docker（省去安装配置的麻烦），应用原生跑（省去构建时间）。

### 5.4 启动数据库

```bash
cd /home/ubuntu/quickmark
docker compose up -d db redis
```

`-d` 表示后台运行（detach）。

查看状态：
```bash
docker compose ps
```

---

## 第六章：安全加固

### 6.1 全局限流（防刷接口）

使用 `express-rate-limit` 中间件，在 `server.js` 中配置：

```javascript
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 分钟窗口
  max: 100,                  // 最多 100 次请求
  message: { error: '请求过于频繁' }
});
app.use('/api', apiLimiter);
```

### 6.2 注册限流（防恶意注册）

```javascript
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟窗口
  max: 5,                     // 最多注册 5 次
  message: { error: '注册尝试过多' }
});
router.post('/register', registerLimiter, async (req, res) => { ... });
```

### 6.3 登录限流

登录端点已有限流，10 次/15 分钟/IP。

### 6.4 防火墙（UFW）

Ubuntu 自带的防火墙工具，只开放必要端口：

```bash
sudo ufw --force enable              # 启用防火墙
sudo ufw default deny incoming        # 默认阻止所有入站
sudo ufw default allow outgoing       # 允许所有出站
sudo ufw allow 22/tcp                 # 开放 SSH（不然会把自己关在外面）
sudo ufw allow 3000/tcp               # 开放应用端口
sudo ufw deny 5555/tcp                # 阻止 Prisma Studio 外网访问
```

### 6.5 PM2 进程守护

Node.js 应用挂了不会自动重启，PM2 解决了这个问题：

```bash
# 安装
sudo npm install -g pm2

# 启动应用（带守护）
pm2 start server.js --name quickmark

# 保存进程列表（重启后自动恢复）
pm2 save

# 设置开机自启
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 常用命令
pm2 list              # 查看所有进程
pm2 logs quickmark    # 查看日志
pm2 restart quickmark # 重启
pm2 stop quickmark    # 停止
```

---

## 第七章：Prisma Studio 数据库管理

### 7.1 什么是 Prisma Studio？

Prisma 自带的数据库 Web GUI，可以在浏览器里查看和编辑数据库表。

### 7.2 启动

用 PM2 管理，开机自启：

```bash
cd /home/ubuntu/quickmark
pm2 start "npx prisma studio --port 5555 --browser none" --name studio
```

### 7.3 为什么不直接开公网？

Prisma Studio **没有登录验证**，任何人访问 5555 端口都能直接操作数据库。所以：
1. UFW 挡住 5555 端口的外网访问
2. 通过 SSH 隧道访问：在本地建一条加密通道到服务器

```powershell
# 在本地 PowerShell 执行
ssh -i C:\Users\33512\Desktop\ayf.pem -L 5555:localhost:5555 ubuntu@118.89.199.84
```

`-L 5555:localhost:5555` 的意思是：本地 5555 端口 → SSH 加密通道 → 服务器 localhost:5555

保持窗口开着，浏览器访问 `http://localhost:5555`。

---

## 第八章：域名、端口与反向代理

### 8.1 一个服务器跑多个项目

一台服务器可以同时运行多个项目，通过不同的端口区分：

| 项目 | 端口 | 访问方式 |
|------|------|---------|
| QuickMark | 3000 | `http://IP:3000` |
| 博客 | 4000 | `http://IP:4000` |
| 其他 | 5000 | `http://IP:5000` |

### 8.2 域名的作用

域名是 IP 地址的别名，方便记忆。配合 nginx 反向代理，可以：
- 用子域名区分不同项目：`note.你的域名` → QuickMark，`blog.你的域名` → 博客
- 统一用 443 端口（HTTPS），不用记端口号
- 一张 SSL 证书覆盖所有子域名

### 8.3 端口 vs 域名

| 对比 | 端口方式 | 域名方式 |
|------|---------|---------|
| 易用性 | 要记端口号 | 域名好记 |
| 安全性 | 每个端口都要考虑 | 统一 HTTPS |
| 成本 | 免费 | 域名几块钱/年 |
| 适用场景 | 临时、自用 | 正式对外服务 |

---

## 附录：常用命令速查

```bash
# SSH 连接
ssh -i 密钥路径 用户名@服务器IP

# 查看进程
pm2 list
ps aux | grep node

# 查看端口占用
lsof -i:3000

# 查看日志
pm2 logs quickmark
tail -f /tmp/quickmark.log

# 重启应用
pm2 restart quickmark

# Docker 操作
docker compose ps                  # 查看容器状态
docker compose logs db             # 查看数据库日志
docker compose restart redis       # 重启 Redis

# 文件传输（本地执行）
scp -i 密钥 本地文件 用户名@IP:服务器路径

# 防火墙
sudo ufw status                    # 查看规则
sudo ufw allow 4000/tcp            # 开放端口
```
