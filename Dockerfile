# ===== Stage 1: Build =====
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

# 先复制 prisma schema 再装依赖，确保 postinstall 钩子能执行 prisma generate
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install

# 复制其余项目文件
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY css ./css
COPY server.js ./
COPY db ./db

# 构建前端
RUN npm run build


# ===== Stage 2: Run =====
FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
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
