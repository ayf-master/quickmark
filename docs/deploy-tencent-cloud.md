# QuickMark 腾讯云部署指南（Windows + 宝塔面板）

## 📋 前置条件

你服务器上应该已经有的：
- ✅ 宝塔 Windows 面板
- ✅ Docker（MySQL + Redis 已在跑）
- ✅ 宝塔防火墙已放行 3000 端口

还需要确认/安装的：
- ⬜ Node.js（宝塔面板 → 软件商店 → 搜索 "Node.js版本管理器" 安装）
- ⬜ 腾讯云安全组放行 3000 端口（**这个最关键！**）

---

## 🚀 部署步骤

### 第一步：腾讯云安全组放行 3000 端口

> ⚠️ 这是最容易漏的一步！宝塔防火墙 ≠ 腾讯云安全组，两套都要开！

**轻量应用服务器：**
1. 登录腾讯云控制台 → 轻量应用服务器
2. 找到你的实例 → 点进详情
3. **「防火墙」** 标签 → 添加规则
   - 协议：TCP
   - 端口：3000
   - 来源：所有 IPv4（0.0.0.0/0）
   - 策略：允许

**CVM 云服务器：**
1. 登录腾讯云控制台 → 云服务器 CVM
2. 找到你的实例 → 点击实例名
3. **「安全组」** 标签 → 点进绑定的安全组
4. 入站规则 → 添加规则
   - 类型：自定义
   - 协议端口：TCP:3000
   - 来源：0.0.0.0/0
   - 策略：允许

---

### 第二步：上传项目到服务器

**方法 A — 宝塔面板上传：**
1. 宝塔面板 → 文件 → 建目录 `D:\wwwroot\quickmark`
2. 把本地 `D:\vibeCoding\quickmark` 下的文件打包上传
   - **注意排除**：`node_modules`、`.env`、`.workbuddy`、`test`、`uploads`、`*.log`

**方法 B — Git 克隆（推荐）：**
如果项目有 Git 仓库，直接在服务器上克隆：
```powershell
cd D:\wwwroot
git clone 你的仓库地址 quickmark
```

---

### 第三步：在服务器上创建 .env 文件

在 `D:\wwwroot\quickmark` 目录下创建 `.env` 文件：

```env
# ==================== 服务器 ====================
PORT=3000

# ==================== 数据库 ====================
# MySQL 在 Docker 里, 映射到 127.0.0.1:3306, 所以 DB_HOST=localhost
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=quickmark

# ==================== Prisma ====================
DATABASE_URL="mysql://root:你的MySQL密码@localhost:3306/quickmark"
# 注意: 密码里有特殊字符要 URL 编码, 比如 @ 写成 %40

# ==================== 鉴权 ====================
JWT_SECRET=你的JWT密钥(至少32字符)
JWT_ISSUER=quickmark
JWT_AUDIENCE=quickmark-web

# 生产环境关闭开放注册
ALLOW_REGISTER=0

# ==================== Redis ====================
# Redis 在 Docker 里, 映射到 127.0.0.1:6379
REDIS_URL=redis://localhost:6379

# ==================== 日志 ====================
LOG_LEVEL=info
```

> 💡 **生成 JWT_SECRET**：在 PowerShell 里跑：
> ```powershell
> node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
> ```

---

### 第四步：安装依赖 + 构建前端

在服务器 PowerShell 里（cd 到项目目录）：

```powershell
cd D:\wwwroot\quickmark

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 构建前端
npm run build
```

> ⚠️ 如果 npm install 在国内服务器超时，用镜像：
> ```powershell
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

---

### 第五步：初始化数据库

MySQL Docker 容器启动时已经自动执行了 schema.sql，但如果需要手动初始化：

```powershell
# 在项目目录下
node db/init.js
```

---

### 第六步：用 PM2 启动（推荐）

**方法 A — 宝塔面板操作（最简单）：**
1. 宝塔面板 → 软件商店 → 搜索 **"PM2管理器"** → 安装
2. 左侧菜单 → **PM2** → 添加项目
   - 启动文件：`D:\wwwroot\quickmark\server.js`
   - 运行目录：`D:\wwwroot\quickmark`
   - 项目名称：`quickmark`
3. 点击 **启动**

**方法 B — 命令行操作：**
```powershell
# 安装 PM2
npm install -g pm2

# 启动项目
cd D:\wwwroot\quickmark
pm2 start server.js --name quickmark

# 设置开机自启
pm2 save
pm2 startup
```

---

### 第七步：验证

```powershell
# 1. 看进程状态
pm2 status

# 2. 看日志（关键！看有没有报错）
pm2 logs quickmark

# 3. 本机测试
curl http://localhost:3000

# 4. 外网测试（在你本地电脑浏览器访问）
# http://你的服务器IP:3000
```

---

## 🔧 常见问题

### Q: PM2 日志显示 JWT_SECRET 报错
→ `.env` 没放对位置，确保 `.env` 在项目根目录 `D:\wwwroot\quickmark\.env`

### Q: 数据库连不上
→ 检查 Docker MySQL 容器是否在跑：`docker ps`
→ 如果 MySQL 端口映射是 `127.0.0.1:3306:3306`，那 `.env` 里 `DB_HOST=localhost` 是对的
→ 确认密码一致

### Q: npm install 超时
→ 换国内镜像：`npm config set registry https://registry.npmmirror.com`

### Q: 外网还是访问不了
→ 检查腾讯云安全组（见第一步）
→ 检查 `pm2 logs` 看有没有报错
→ 服务器上跑 `netstat -ano | findstr :3000` 确认端口在监听

---

## 🐳 如果想用 Docker 部署 Node.js（可选）

Dockerfile 已修复 npm 镜像源问题，可以重新试 Docker 部署：

```powershell
cd D:\wwwroot\quickmark

# 确保 Docker 里 MySQL 和 Redis 已在跑
docker-compose up -d db redis

# 构建并启动 app（需要先在 .env 里设好 JWT_SECRET）
docker-compose build --no-cache app
docker-compose up -d app

# 看日志
docker-compose logs -f app
```

> ⚠️ Docker 方式需要在服务器上创建 `.env` 文件，`docker-compose.yml` 会从中读取 `JWT_SECRET`
