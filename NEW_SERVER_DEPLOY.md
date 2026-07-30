# QuickMark 新服务器（124.222.192.166）上手备忘

> 写于 2026-07-29，实测确认。老服务器 118.89.199.84 仍在跑，数据已用自定义镜像 `ayf` 迁移过来。

## 1. 服务器信息
- 云厂商：腾讯云轻量应用服务器（Lighthouse）· 上海
- IP：124.222.192.166
- 系统：Ubuntu 20.04 · 2 核 / 2GB / 50GB
- 实例名：ayf-XcVc

## 2. SSH 连接
- 用户：`ubuntu`
- 密钥：`C:\Users\33512\Desktop\ayf.pem`
- 已配别名，本地直接：
  ```bash
  ssh quickmark
  ```
  （别名写在 `~/.ssh/config`，Host=quickmark）

## 3. 真实部署架构（重要！和 docker-compose 不一样）
| 组件 | 运行方式 | 状态 |
|------|----------|------|
| MySQL | Docker 容器 `quickmark-db`（restart:always） | healthy，监听 127.0.0.1:3306 |
| Redis | Docker 容器 `quickmark-redis`（restart:always） | healthy，监听 127.0.0.1:6379 |
| 应用 | **宿主机 node + PM2 直接跑**（非 Docker 容器） | PM2 进程 `quickmark` 在线 |
| Prisma Studio | PM2 进程 `studio`（:5555） | online |

- 项目目录：`/home/ubuntu/quickmark`
- 应用入口：`node /home/ubuntu/quickmark/server.js`，监听 `0.0.0.0:3000`
- Docker 数据卷：`quickmark_mysql_data`、`quickmark_uploads`（数据完整）
- ⚠️ `docker-compose.yml` 里的 `app` 服务**没在用**，别被它误导

## 4. 当前状态 + 为什么"网站没起来"
- 本地健康检查通过：`curl http://127.0.0.1:3000/api/health` → `{"status":"ok","mode":"prisma"}`
- node 在 `0.0.0.0:3000` 监听正常
- **外网访问不了的唯一原因：腾讯云轻量"防火墙"（安全组）没放行 TCP 3000**
  - 轻量服务器防火墙在腾讯云侧，实例内 `ufw`/`iptables` 看不到也改不了，只能去控制台加规则

## 5. 立即修复（控制台操作，一步）
1. 腾讯云控制台 → **轻量应用服务器**
2. 选实例 `ayf-XcVc`（上海）
3. 左侧菜单 **防火墙**
4. **添加规则**：
   - 应用类型：自定义
   - 协议：TCP
   - 端口：3000
   - 策略：允许
   - 来源：0.0.0.0/0（或"全部 IPv4"）
5. 确定

放行后访问：**http://124.222.192.166:3000**

## 6. 同步最新代码（等能访问后再做）
服务器当前是 7-2 迁移的旧代码，本地 7-28/29 改的 onboarding 还没上去：
```bash
# 本地
git push

# 服务器
ssh quickmark
cd /home/ubuntu/quickmark
git pull
npm run build          # 重新生成前端 dist
pm2 restart quickmark   # 必须重启才生效
```

## 7. 常用运维命令（服务器上）
```bash
pm2 list                # 看进程
pm2 logs quickmark      # 看应用日志
pm2 restart quickmark   # 重启应用
docker ps -a            # 看 MySQL/Redis 容器
curl http://127.0.0.1:3000/api/health   # 健康检查
```
