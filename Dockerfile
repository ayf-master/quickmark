# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build


# ===== Stage 2: Run =====
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production --ignore-scripts

# 复制构建产物
COPY --from=builder /app/dist ./dist
# 复制 Prisma 生成文件
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
# 复制后端代码
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/db ./db
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["node", "server.js"]
