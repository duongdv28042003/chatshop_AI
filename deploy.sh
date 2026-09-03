#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 BẮT ĐẦU TRIỂN KHAI HỆ THỐNG SHOPPING AI LÊN VPS"
echo "=========================================================="

# 1. Kiểm tra và cài đặt Docker nếu chưa có
if ! command -v docker &> /dev/null; then
    echo "📦 Đang cài đặt Docker và Docker Compose..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Cài đặt Docker thành công!"
fi

# 2. Tạo file .env nếu chưa có
if [ ! -f .env ]; then
    echo "⚙️ Tạo file cấu hình .env từ mẫu .env.production.example..."
    cp .env.production.example .env
fi

# 3. Tạo thư mục chứa uploads và SSL nếu cần
mkdir -p nginx/ssl nginx/certbot/conf nginx/certbot/www

# 4. Build và khởi chạy Docker Compose Production
echo "🏗️ Đang Build và chạy các container (DB, Redis, Backend, AI Service, Frontend, Nginx)..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

echo "=========================================================="
echo "🎉 HỆ THỐNG ĐÃ ĐƯỢC TRIỂN KHAI THÀNH CÔNG!"
echo "=========================================================="
docker compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Truy cập Web: http://<IP_VPS>:8080/"
echo "🔗 Webhook Zalo OA: http://<IP_VPS>:8080/webhook/zalo"
echo "📡 API Backend: http://<IP_VPS>:8080/api/"
echo "=========================================================="
