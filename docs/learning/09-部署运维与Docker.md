# 09 · 部署运维：Docker 与 PM2

> 简历写"熟悉 Docker/部署"的前提是你能讲清楚"这个项目是怎么上线的"。
> 读完本文你应能：独立完成一次从零部署、解释 Docker 核心概念、处理常见故障。

---

## 1. 部署架构总览（本项目实际方案）

```
                    ┌─────────────────────────┐
   用户浏览器 ──▶ 124.222.192.166:3000 ──▶  │  Ubuntu 20.04 服务器     │
                    │  ┌───────────────────┐  │
                    │  │ PM2 (进程守护)     │  │
                    │  │  quickmark: node  │  │  ← 应用直接在宿主机跑
                    │  │  server.js :3000  │  │
                    │  └───────────────────┘  │
                    │  ┌───────────────────┐  │
                    │  │ Docker 容器        │  │
                    │  │  quickmark-db     │  │  ← MySQL 8 (127.0.0.1:3306)
                    │  │  quickmark-redis  │  │  ← Redis 7 (127.0.0.1:6379)
                    │  └───────────────────┘  │
                    └─────────────────────────┘
```

**混合部署策略**（面试可以讲为什么）：
- 数据库用 Docker：免安装配置、数据卷持久化、环境隔离
- 应用直接跑宿主机 + PM2：低配服务器（2C2G）省资源、启动快、无需构建镜像
- 数据库只监听 `127.0.0.1`：外网扫不到 3306，安全

---

## 2. Docker 核心概念（60 秒速成）

| 概念 | 解释 | 类比 |
|------|------|------|
| 镜像（Image） | 只读模板，包含代码+环境 | 安装包 |
| 容器（Container） | 镜像的运行实例 | 安装好的程序 |
| Dockerfile | 构建镜像的说明书 | 安装步骤 |
| docker-compose.yml | 多容器编排 | 一键装全家桶 |
| 数据卷（Volume） | 容器外的持久化存储 | 移动硬盘 |

### 2.1 Dockerfile 解读（本项目后端镜像）

```dockerfile
FROM node:20-bookworm-slim    # 基础镜像：Node 20
WORKDIR /app                  # 工作目录
COPY package*.json ./         # 先拷依赖清单
RUN npm install               # 装依赖（有缓存层，package.json 没变就不重装）
COPY prisma ./prisma
RUN npx prisma generate       # 生成 Prisma 客户端
COPY . .                      # 拷全部代码
RUN npm run build             # 构建前端
CMD ["bash", "docker-entrypoint.sh"]   # 启动命令
```

**构建缓存优化（面试点）**：把 `package.json` 先 COPY 再装依赖——依赖层缓存在前面，代码改了不用重新 npm install，构建快很多。

### 2.2 docker-compose.yml 解读

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql    # 数据持久化！
    ports:
      - "127.0.0.1:3306:3306"        # 只监听本机

  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6380:6379"

  app:
    build: .
    depends_on:                      # 依赖启动顺序
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: mysql://root:${DB_PASSWORD}@db:3306/quickmark
    volumes:
      - uploads:/app/uploads         # 上传文件持久化
```

**三个设计点**：
1. `healthcheck`：等数据库"真正健康"再启动应用，避免启动即报错
2. `${DB_PASSWORD}`：密钥走环境变量，不硬编码
3. Volume：容器删了重建，数据还在

---

## 3. 容器启动脚本（docker-entrypoint.sh）

容器启动时自动做三件事：

```bash
#!/bin/sh
set -e
# 1. 同步数据库结构（schema 改了自动建表/加列）
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss
# 2. 创建中文全文索引（Prisma 表达不了的 SQL）
node -e "CREATE FULLTEXT INDEX ... WITH PARSER ngram"
# 3. 启动应用
exec node server.js
```

**`exec` 的作用（面试点）**：`exec` 用新进程替换当前 shell——保证 Node 进程是 PID 1，Docker 停容器时信号直接送达，能优雅关闭。

---

## 4. PM2 进程守护

### 4.1 为什么需要 PM2？

- Node 进程崩溃后不会自动重启 → 网站挂掉没人知道
- PM2 监控 + 自动重启 + 开机自启 + 日志管理

### 4.2 常用命令

```bash
pm2 list                    # 查看进程状态
pm2 logs quickmark          # 实时日志
pm2 restart quickmark       # 重启
pm2 save                    # 保存进程列表（重启服务器后自动恢复）
pm2 startup                 # 配置开机自启
```

### 4.3 部署流程（本项目实战脚本）

```bash
# 本地
git add -A && git commit -m "..." && git push

# 服务器（ssh quickmark 进入）
cd /home/ubuntu/quickmark
git pull                          # 1. 拉最新代码
npm install                       # 2. 装依赖（package.json 变了才需要）
npx prisma db push                # 3. 同步数据库结构（重要！）
npm run build                     # 4. 构建前端（dist/）
pm2 restart quickmark             # 5. 重启应用
curl http://localhost:3000/api/health   # 6. 健康检查
```

**核心原则：`prisma db push` 必须先于 `pm2 restart`**——新代码读新字段，数据库必须提前就绪。

---

## 5. 环境变量管理

### 5.1 .env 文件（服务器上）

```bash
PORT=3000
DATABASE_URL=mysql://root:xxx@localhost:3306/quickmark
JWT_SECRET=xxxxx              # 32+ 位随机串
SMTP_HOST=smtp.qq.com         # 邮件服务
SMTP_USER=3351247805@qq.com
SMTP_PASS=mjlfdycfnxiachjj    # QQ 邮箱授权码（不是登录密码！）
```

### 5.2 QQ 邮箱授权码（邮件功能的关键）

QQ 邮箱 SMTP 不用登录密码，用**授权码**：
```
QQ邮箱 → 设置 → 账户 → 开启 SMTP 服务 → 生成授权码
```

### 5.3 安全规范（面试点）

- `.env` 加入 `.gitignore`，绝不提交到 git
- JWT_SECRET 等密钥只存在于服务器
- 本地 `.env.example` 只放字段名不放真实值

---

## 6. 服务器防火墙（腾讯云轻量）

⚠️ 腾讯云轻量服务器有**两层防火墙**：
1. 系统内 UFW（可选）
2. **腾讯云控制台的安全组/防火墙**（必须去网页控制台配）

放行规则：TCP 3000（应用端口）、TCP 22（SSH）、TCP 3306 **不要**放行（数据库只走内网）。

---

## 7. 故障排查手册（实战经验）

### 7.1 网站打不开

```bash
curl http://localhost:3000/api/health   # 先在本机测
pm2 logs quickmark --lines 50           # 看应用日志
docker ps                               # 数据库容器活着吗？
```

### 7.2 改了代码不生效（本项目踩过的大坑）

```
症状：git pull 了、pm2 restart 了，功能还是旧的
原因1：Node require 缓存 —— 同一进程内 require 过旧文件
      解决：delete require.cache + 重启（见 00 文档记忆）
原因2：前端没重新构建 —— 浏览器拿到的是 dist/ 旧产物
      解决：npm run build 后硬刷新（Ctrl+Shift+R）
```

### 7.3 数据库 schema 变了启动失败

```
错误：Table notes has no column plan_data
解决：先跑 npx prisma db push 同步结构，再重启应用
```

### 7.4 数据备份（本项目有脚本 backup-server-db.sh）

```bash
# 备份整个数据库到 SQL 文件
mysqldump -h localhost -u root -pxxx quickmark > backups/quickmark_backup_$(date +%Y%m%d).sql
```

**面试话术**："我有定时备份习惯：数据是服务器的生命线，上线前先备份，迁移时双保险。"

---

## 8. 完整面试模拟（部署相关）

**Q：整个部署流程讲一下？**
> 代码推 GitHub → SSH 上服务器 → git pull → npm install → prisma db push 同步表结构 → npm run build 构建前端 → pm2 restart → 健康检查。数据库和 Redis 是 Docker 容器常驻，应用用 PM2 守护，数据卷持久化。

**Q：数据会丢吗？**
> MySQL 数据在 Docker volume 里，容器删了重建数据还在；另外有 mysqldump 定期备份脚本。

**Q：怎么更新数据库结构？**
> 改 prisma/schema.prisma → 本地测试 → 服务器 npx prisma db push → 重启应用。生产用小改动，正式项目用 migrate 迁移文件保证可回滚。

---

## 9. 自测题

1. Docker 镜像和容器有什么区别？
2. 为什么数据卷（volume）重要？数据存在哪？
3. 混合部署为什么数据库用 Docker、应用用 PM2？
4. 部署顺序为什么必须先 db push 再 restart？
5. `exec node server.js` 和 `node server.js` 的区别？
6. 生产环境的密钥怎么管理？
7. QQ 邮箱授权码和登录密码有什么区别？

下一篇 → [10-简历描述与面试准备](10-简历描述与面试准备.md)
