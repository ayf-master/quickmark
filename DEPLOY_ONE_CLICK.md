# 一键部署

## 工作流

本地改完代码，push 到 GitHub：

```bash
git add .
git commit -m "改了啥"
git push
```

然后服务器一条命令搞定：

```bash
ssh -i "你的密钥路径" ubuntu@118.89.199.84 "cd ~/quickmark && ./deploy.sh"
```

## deploy.sh 在服务器上做了什么

路径 `~/quickmark/deploy.sh`：

1. `git pull` — 拉最新代码
2. `npx vite build` — 构建前端
3. `pm2 restart quickmark` — 重启服务
