#!/bin/bash
# QuickMark 部署诊断脚本
# 在服务器上运行: bash diagnose.sh
# 会逐项检查公网访问不通的常见原因

echo "========================================"
echo "  QuickMark 部署诊断"
echo "========================================"
echo ""

# 1. 检查 Node.js 进程
echo "[1/7] 检查 Node.js 进程是否在运行..."
if pgrep -f "node server.js" > /dev/null 2>&1; then
    echo "  ✅ Node.js 进程正在运行"
    pgrep -af "node server.js"
else
    echo "  ❌ 未发现 node server.js 进程!"
    echo "     → 进程没启动或已崩溃, 检查:"
    echo "       - JWT_SECRET 是否设置 (>=32字符)"
    echo "       - MySQL 是否可连接"
    echo "       - 运行 node server.js 看报错输出"
fi
echo ""

# 2. 检查端口监听
echo "[2/7] 检查 3000 端口监听状态..."
if command -v ss > /dev/null 2>&1; then
    PORT_INFO=$(ss -tlnp | grep ':3000' 2>/dev/null)
elif command -v netstat > /dev/null 2>&1; then
    PORT_INFO=$(netstat -tlnp | grep ':3000' 2>/dev/null)
else
    PORT_INFO=""
    echo "  ⚠️  ss 和 netstat 都不可用, 跳过端口检查"
fi

if [ -n "$PORT_INFO" ]; then
    echo "  ✅ 3000 端口正在监听:"
    echo "     $PORT_INFO"
    if echo "$PORT_INFO" | grep -q '127.0.0.1:3000'; then
        echo "  ⚠️  监听在 127.0.0.1 (仅本机), 公网无法访问!"
        echo "     → 检查 server.js 是否用 app.listen(PORT, '0.0.0.0', ...)"
    elif echo "$PORT_INFO" | grep -q '0.0.0.0:3000\|*:3000'; then
        echo "  ✅ 监听在 0.0.0.0 (所有网卡), 公网可访问"
    fi
else
    echo "  ❌ 3000 端口没有监听!"
    echo "     → Node.js 进程可能没启动或启动失败"
fi
echo ""

# 3. 检查本地访问
echo "[3/7] 检查本机能否访问 3000 端口..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
    echo "  ✅ 本机访问成功, HTTP 状态码: $HTTP_CODE"
else
    echo "  ❌ 本机也无法访问 3000 端口!"
    echo "     → 服务本身有问题, 不是网络/防火墙问题"
fi
echo ""

# 4. 检查防火墙
echo "[4/7] 检查系统防火墙..."
if command -v firewall-cmd > /dev/null 2>&1; then
    FW_STATE=$(firewall-cmd --state 2>/dev/null)
    echo "  firewalld 状态: $FW_STATE"
    if [ "$FW_STATE" = "running" ]; then
        FW_PORTS=$(firewall-cmd --list-ports 2>/dev/null)
        echo "  已放行端口: $FW_PORTS"
        if echo "$FW_PORTS" | grep -q '3000'; then
            echo "  ✅ 3000 端口已在 firewalld 放行"
        else
            echo "  ❌ 3000 端口未在 firewalld 放行!"
            echo "     → 执行: firewall-cmd --add-port=3000/tcp --permanent && firewall-cmd --reload"
        fi
    fi
elif command -v ufw > /dev/null 2>&1; then
    UFW_STATE=$(ufw status 2>/dev/null)
    echo "  ufw 状态:"
    echo "  $UFW_STATE"
    if echo "$UFW_STATE" | grep -q '3000'; then
        echo "  ✅ 3000 端口已在 ufw 放行"
    else
        echo "  ❌ 3000 端口未在 ufw 放行!"
        echo "     → 执行: ufw allow 3000/tcp"
    fi
else
    echo "  ℹ️  未检测到 firewalld 或 ufw, 可能没装防火墙 (跳过)"
fi
echo ""

# 5. 检查 iptables
echo "[5/7] 检查 iptables 规则..."
IPTABLES_3000=$(iptables -L -n 2>/dev/null | grep '3000')
if [ -n "$IPTABLES_3000" ]; then
    echo "  发现 iptables 中有 3000 相关规则:"
    echo "  $IPTABLES_3000"
else
    echo "  ℹ️  iptables 中没有 3000 相关规则 (通常没问题)"
fi
echo ""

# 6. 检查 Docker
echo "[6/7] 检查 Docker 容器状态..."
if command -v docker > /dev/null 2>&1; then
    DOCKER_PS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null)
    echo "  运行中的容器:"
    echo "  $DOCKER_PS"
    if docker ps 2>/dev/null | grep -q 'quickmark-app'; then
        echo "  ✅ quickmark-app 容器在运行"
    else
        echo "  ⚠️  quickmark-app 容器未运行 (如果你用 Docker 部署的话)"
    fi
else
    echo "  ℹ️  未安装 Docker (跳过)"
fi
echo ""

# 7. 检查 .env
echo "[7/7] 检查环境变量配置..."
if [ -f ".env" ]; then
    echo "  ✅ .env 文件存在"
    # 检查关键变量 (不打印值)
    if grep -q "^JWT_SECRET=." .env 2>/dev/null; then
        JWT_LEN=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2 | tr -d ' "' | wc -c)
        echo "  ✅ JWT_SECRET 已设置 (长度: $((JWT_LEN-1)) 字符)"
        if [ "$JWT_LEN" -lt 33 ]; then
            echo "  ⚠️  JWT_SECRET 长度不足 32 字符, 服务会拒绝启动!"
        fi
    else
        echo "  ❌ JWT_SECRET 未在 .env 中设置!"
    fi
    if grep -q "^DB_PASSWORD=." .env 2>/dev/null; then
        echo "  ✅ DB_PASSWORD 已设置"
    else
        echo "  ⚠️  DB_PASSWORD 未设置"
    fi
else
    echo "  ❌ .env 文件不存在!"
    echo "     → 复制 .env.example 为 .env 并填入配置"
fi
echo ""

# 总结
echo "========================================"
echo "  诊断完成"
echo "========================================"
echo ""
echo "最常见的原因 (按概率排序):"
echo "  1. 腾讯云安全组没放行 3000 端口 (最常见!)"
echo "     → 控制台 → 安全组 → 入站规则 → 添加 TCP:3000 允许"
echo "  2. Node.js 进程没启动成功 (缺 JWT_SECRET / 数据库连不上)"
echo "  3. 系统防火墙 (firewalld/ufw) 没放行 3000"
echo "  4. 用 node server.js 前台启动, 终端关了进程就死了"
echo "     → 改用 PM2: pm2 start server.js --name quickmark"
