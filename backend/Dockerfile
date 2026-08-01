# ==========================================
# STAGE 1: Build ứng dụng NestJS
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file định nghĩa package để cài đặt dependencies
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm devDependencies để build)
RUN npm ci

# Copy toàn bộ mã nguồn backend
COPY . .

# Build ứng dụng NestJS ra thư mục /dist
RUN npm run build

# ==========================================
# STAGE 2: Môi trường chạy Production
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package.json và cài đặt chỉ production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy kết quả build từ Stage 1
COPY --from=builder /app/dist ./dist

# Mở cổng 3000 cho NestJS Backend
EXPOSE 3000

# Lệnh khởi chạy server NestJS khi container sẵn sàng
CMD ["node", "dist/main.js"]
