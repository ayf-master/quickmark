# QuickMark Docker 部署指南

## 1. 在服务器上安装 Docker

### 使用一键安装脚本（推荐）
在 PowerShell(管理员) 中执行：

```powershell
# 安装 Docker Desktop for Windows
# 1. 打开浏览器访问 https://docs.docker.com/desktop/install/windows-install/
# 2. 下载 Docker Desktop Installer
# 3. 双击安装，选 "Use WSL 2 instead of Hyper-V"
# 4. 安装完成后重启服务器
```

### 安装后验证
```powershell
docker --version
docker-compose --version
```

## 2. 克隆项目

```powershell
cd C:\
git clone https://github.com/ayf-master/quickmark.git
cd quickmark
```

## 3. 配置环境变量

```powershell
# 复制环境配置
copy .env.example .env

# 编辑 .env 文件，修改以下字段：
# JWT_SECRET = 执行下面命令生成
```

生成 JWT 密钥：
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## 4. 启动

```powershell
# 一键启动所有服务
docker-compose up -d

# 查看启动状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

等待 1-2 分钟，然后访问 `http://服务器IP:3000`

## 5. 常用命令

```powershell
# 停止所有服务
docker-compose down

# 重启
docker-compose restart

# 更新代码后重新部署
git pull
docker-compose build app
docker-compose up -d

# 查看日志
docker-compose logs -f app
```

## 6. 默认账号

用户名：`admin`
密码：`password`
