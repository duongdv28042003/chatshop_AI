# 🚀 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG LÊN VPS (UBUNTU / DEBIAN)

Hệ thống được đóng gói trọn gói bằng **Docker Compose Production** gồm:
1. **PostgreSQL 16 (pgvector)**: Cơ sở dữ liệu sản phẩm, đơn hàng, khách hàng, hội thoại.
2. **Redis 7**: Bộ nhớ đệm hội thoại AI và phiên làm việc.
3. **Backend .NET 9 Web API**: Quản lý nghiệp vụ, CRUD sản phẩm, đơn hàng, phân quyền, upload ảnh.
4. **Python FastAPI AI**: Xử lý Webhook Zalo OA, tư vấn bán hàng, đề xuất size, rule-based AI.
5. **Next.js 15 Frontend**: Giao diện Cửa Hàng, Giỏ Hàng, Đơn Mua, Dashboard Quản trị.
6. **Nginx Reverse Proxy**: Cổng điều phối tập trung port 80/443, bảo mật và routing.

---

## 🛠️ BƯỚC 1: ĐƯA MÃ NGUỒN LÊN VPS

Mở Terminal trên máy tính cá nhân hoặc kết nối SSH vào VPS:

```bash
# 1. Kết nối vào VPS của bạn qua SSH
ssh root@<IP_VPS_CỦA_BẠN>

# 2. Clone hoặc tải mã nguồn dự án vào VPS
git clone <LINK_GIT_CỦA_BẠN> /var/www/cs-agents
cd /var/www/cs-agents
```

*(Hoặc dùng FileZilla / WinSCP để upload toàn bộ thư mục dự án lên VPS)*

---

## ⚙️ BƯỚC 2: CẤU HÌNH BIẾN MÔI TRƯỜNG

1. Tạo file `.env` từ file mẫu:
   ```bash
   cp .env.production.example .env
   ```
2. Mở file `.env` để sửa mật khẩu database và thông tin Zalo OA (nếu có):
   ```bash
   nano .env
   ```
   *(Nhấn `Ctrl + O` để lưu, `Ctrl + X` để thoát).*

---

## 🚀 BƯỚC 3: CHẠY LỆNH TRIỂN KHAI TỰ ĐỘNG (1-CLICK)

Cấp quyền thực thi và chạy kịch bản deploy:
```bash
chmod +x deploy.sh
./deploy.sh
```

> ⏳ Script sẽ tự động cài Docker, Build toàn bộ các container và khởi động hệ thống trong vòng 2-3 phút!

---

## 🌐 BƯỚC 4: KIỂM TRA TRUY CẬP

Sau khi script chạy xong:
* **Giao diện Web Khách Hàng & Quản trị**: `http://<IP_VPS>/`
* **Webhook Zalo OA**: `http://<IP_VPS>/webhook/zalo` (hoặc `https://yourdomain.com/webhook/zalo`)
* **API Backend**: `http://<IP_VPS>/api/`

---

## 🔒 BƯỚC 5: CẤU HÌNH TÊN MIỀN & SSL HTTPS MIỄN PHÍ (CHO ZALO OA)

Nếu bạn có tên miền (ví dụ `shop.yourdomain.com`) trỏ về IP VPS:
1. Cài đặt Certbot trên VPS:
   ```bash
   apt install -y certbot
   certbot certonly --standalone -d shop.yourdomain.com
   ```
2. Copy chứng chỉ vào thư mục `nginx/ssl/` hoặc cấu hình tự động gia hạn Let's Encrypt.
3. Điền URL `https://shop.yourdomain.com/webhook/zalo` vào trang Quản lý Zalo for Developers.

---

## 🔄 CÁC LỆNH QUẢN TRỊ THƯỜNG DÙNG TRÊN VPS:

* **Xem trạng thái các container**:
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
* **Xem nhật ký hoạt động (Logs)**:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  # Hoặc xem riêng từng service:
  docker compose -f docker-compose.prod.yml logs -f backend
  docker compose -f docker-compose.prod.yml logs -f ai-service
  ```
* **Cập nhật code mới**:
  ```bash
  git pull
  ./deploy.sh
  ```
* **Khởi động lại toàn bộ**:
  ```bash
  docker compose -f docker-compose.prod.yml restart
  ```
