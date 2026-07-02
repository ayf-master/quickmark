FROM node:20-alpine

WORKDIR /app

# 先复制 schema 文件
COPY prisma/schema.prisma ./prisma/

# 复制 package.json 并安装依赖
COPY package.json ./
RUN npm install --production --ignore-scripts

# 单独安装 prisma 作为工具
RUN npm install -g prisma

# 生成 Prisma 客户端
RUN prisma generate --schema=prisma/schema.prisma

# 复制剩余代码并构建
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
