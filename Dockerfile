# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json ./

# 安装所有依赖（含 dev，需要 vite 和 prisma）
RUN npm install

# 复制源码
COPY . .

# 生成 Prisma 客户端（匹配项目版本 v5）
RUN npx prisma generate

# 构建前端
RUN npm run build


# ===== Stage 2: Run =====
FROM node:20-alpine

WORKDIR /app

# 复制生产依赖
COPY package.json ./
RUN npm install --production

# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/src/api ./src/api
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/db ./db

EXPOSE 3000

CMD ["node", "server.js"]
