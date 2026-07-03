#!/bin/bash
# 从完整数据目录恢复 stu 和 online_study 数据库
# 1. 短暂停本地 MySQL，复制完整数据目录
# 2. 用 Docker 启动临时 MySQL 读取史数据
# 3. 导出为 SQL 文件
# 用法: bash docs/recover_via_docker.sh

set -e

MYSQL_DIR="/d/mysql/mysql-8.0.31-winx64"
DOCKER_DIR="/d/mysql-recovery-$$"

echo "=== 1. 停止本地 MySQL ==="
echo "  短暂停止以复制完整数据目录..."
net stop MySQL 2>/dev/null || true
taskkill /f /im mysqld.exe 2>/dev/null || true
sleep 2

echo "=== 2. 复制完整数据目录 ==="
mkdir -p "$DOCKER_DIR/data"
cp -r "$MYSQL_DIR/data" "$DOCKER_DIR/data"
echo "  ✓ 已复制到 $DOCKER_DIR/data"

echo ""
echo "=== 3. 启动本地 MySQL ==="
echo "  重启..."
# 后台启动 MySQL
"$MYSQL_DIR/bin/mysqld" --console --datadir="$MYSQL_DIR/data" --port=3306 &
MYSQL_PID=$!
echo "  MySQL PID: $MYSQL_PID"
sleep 5

echo ""
echo "=== 4. 用 Docker 启动临时 MySQL ==="
docker rm -f mysql-recovery 2>/dev/null || true
echo "  启动 Docker MySQL (innodb_force_recovery=1)..."
docker run -d --name mysql-recovery \
  -v "$DOCKER_DIR/data":/var/lib/mysql:ro \
  -p 3307:3306 \
  mysql:8.0.31 \
  --innodb_force_recovery=1 \
  --skip-log-bin

echo "  等待启动 (15秒)..."
sleep 15

echo ""
echo "=== 5. 查看数据库 ==="
docker exec mysql-recovery mysql -uroot -e "SHOW DATABASES;" 2>&1

echo ""
echo "=== 6. 导出数据 ==="
for db in stu online_study; do
  echo "  导出 $db..."
  docker exec mysql-recovery mysqldump -uroot \
    --skip-lock-tables \
    --no-tablespaces \
    --complete-insert \
    "$db" 2>&1 > "$DOCKER_DIR/$db.sql" || true
  if [ -s "$DOCKER_DIR/$db.sql" ]; then
    echo "  ✓ $db: $(wc -c < "$DOCKER_DIR/$db.sql") bytes"
  else
    echo "  ✗ $db 无数据"
  fi
done

echo ""
echo "=== 7. 清理 ==="
docker rm -f mysql-recovery 2>/dev/null || true

echo ""
echo "=== 完成 ==="
echo "备份文件:"
ls -lh "$DOCKER_DIR/"*.sql 2>/dev/null || echo "  无备份文件"
