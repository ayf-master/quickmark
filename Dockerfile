FROM node:18-alpine

# 安装 mysql 客户端（用于健康检查）
RUN apk add --no-cache mysql-client

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm install --production
RUN npm install -g prisma

# 复制代码
COPY . .

# 构建前端
RUN npm run build

# 生成 Prisma 客户端
RUN npx prisma generate

# 入口脚本
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
