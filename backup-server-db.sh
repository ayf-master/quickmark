#!/bin/bash
# QuickMark 服务器数据库备份脚本
# 在你的本机（能 ssh 到服务器的机器）用 Git Bash 运行：
#   bash backup-server-db.sh
#
# 说明：
# - 服务器 ssh 用户是 ubuntu，私钥 ayf.pem
# - 容器名 quickmark-db、库名 quickmark
# - 密码不落在本脚本里：运行时从服务器 /home/ubuntu/quickmark/.env 读 DB_PASSWORD，
#   服务器改密码后本脚本无需同步
# - 备份文件存到 ./backups/，请勿提交到 git（含真实数据）
# - 本脚本只做只读导出，不会修改服务器任何数据

set -e

# ===== 按需修改 =====
SERVER_SSH="ubuntu@124.222.192.166"        # 服务器 ssh 地址（用户名 ubuntu）
SSH_KEY="/c/Users/33512/.ssh/ayf.pem"      # 你的私钥路径
DB_USER="root"
DB_NAME="quickmark"
CONTAINER="quickmark-db"
# ====================

DATE=$(date +%Y%m%d_%H%M%S)
OUT_DIR="./backups"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/${DB_NAME}_backup_${DATE}.sql"

echo "[1/2] SSH 到服务器，从 .env 读密码并用 docker 导出 $DB_NAME ..."
# 单引号包住远端命令：变量在服务器侧求值，密码不经过本机
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_SSH" 'PASS=$(grep -E "^DB_PASSWORD=" /home/ubuntu/quickmark/.env | head -1 | cut -d= -f2-); if [ -z "$PASS" ]; then echo "服务器 .env 里找不到 DB_PASSWORD" >&2; exit 1; fi; docker exec '"$CONTAINER"' mysqldump -u'"$DB_USER"' -p"$PASS" --single-transaction --routines --triggers '"$DB_NAME"'' > "$OUT_FILE"

echo "[2/2] 备份完成："
ls -lh "$OUT_FILE"
echo "已保存到 $OUT_FILE"
