FROM node:18-alpine

WORKDIR /app

# 复制 package.json（不用 lock 文件）
COPY package.json ./

# 安装依赖
RUN npm install --production
RUN npm install -g prisma

# 复制代码
COPY . .

# 构建前端
RUN npm run build

# 生成 Prisma 客户端
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "server.js"]
