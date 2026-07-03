# Prisma Studio 使用指南

Prisma Studio 是 Prisma 自带的数据库 Web 管理界面，可以查看和编辑数据库里的所有数据（用户、笔记、分类等）。

## 前提条件

服务器上 PM2 已经管理着 `studio` 进程，会自动启动。通常无需额外操作。

## 访问步骤

### 第一步：建立 SSH 隧道

在**本地电脑**打开 PowerShell，运行：

```powershell
ssh -i C:\Users\33512\Desktop\ayf.pem -L 5555:localhost:5555 ubuntu@118.89.199.84
```

**保持这个窗口开着不要关**，关闭隧道就断了。

### 第二步：打开浏览器

访问 http://localhost:5555

### 第三步：查看数据

左侧栏选择你要看的表：
- **User** — 查看注册用户
- **Note** — 查看笔记
- **Category** — 查看分类
- 等等

可以直接在界面上搜索、筛选、增删改数据。

## 常见问题

**Q: 连不上 localhost:5555？**
A: 确认 SSH 隧道窗口还在运行，没被关掉。

**Q: SSH 报错 "bad permissions"？**
A: 修复密钥权限：
```powershell
icacls C:\Users\33512\Desktop\ayf.pem /reset
icacls C:\Users\33512\Desktop\ayf.pem /inheritance:r
icacls C:\Users\33512\Desktop\ayf.pem /grant "$env:USERNAME:R"
```

**Q: 端口 5555 被占用？**
A: 可以换一个端口，比如：
```powershell
ssh -i C:\Users\33512\Desktop\ayf.pem -L 5556:localhost:5555 ubuntu@118.89.199.84
```
然后浏览器访问 http://localhost:5556

## 安全说明

- 5555 端口被 UFW 防火墙挡住了公网访问，只有通过 SSH 隧道才能连
- 用完建议直接关掉 SSH 窗口，避免长期暴露
