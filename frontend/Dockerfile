# ==========================================
# STAGE 1: Build ứng dụng React Vite (Admin)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Khai báo biến VITE_API_URL khi build (có thể truyền từ docker-compose hoặc CI/CD)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Phục vụ Web bằng Nginx siêu nhẹ
# ==========================================
FROM nginx:alpine AS production

# Copy file cấu hình Nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy sản phẩm đã build từ Stage 1 sang thư mục web root của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
