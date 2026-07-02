FROM node:20-alpine

WORKDIR /app

# 先复制 schema 和 package.json
COPY prisma/schema.prisma ./prisma/
COPY package.json ./

# 安装依赖（跳过 postinstall）
RUN npm install --production --ignore-scripts

# 复制剩余代码
COPY . .

# 生成 Prisma 客户端 + 构建前端
RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["node", "server.js"]
