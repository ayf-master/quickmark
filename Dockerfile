# ===== Stage 1: Build =====
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

# 先复制 prisma schema 再装依赖，确保 postinstall 钩子能执行 prisma generate
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install

# 复制其余项目文件
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY css ./css
# 关键: Tailwind/PostCSS 配置文件必须随 builder 阶段复制进去,
# 否则 vite build 跑 PostCSS 时找不到插件, @tailwind 指令不会被处理,
# 所有 utility class (w-4 h-16 等) 都不会被生成, UI 会巨变
COPY tailwind.config.js ./
COPY postcss.config.js ./
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
# 复制 Prisma 生成文件 (client 的 query engine)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# 复制 Prisma 引擎二进制 (schema-engine / migration-engine), 供容器内 `prisma migrate deploy` 使用
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
# 复制后端代码
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/db ./db
COPY --from=builder /app/src ./src
# 复制启动入口脚本 (负责 db push 建表 + FULLTEXT 索引 + 起服务)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
