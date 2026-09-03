# Customer Service Agent

Agent tư vấn bán hàng thời trang, hỗ trợ tìm kiếm sản phẩm qua text và ảnh, tích hợp LLM để trả lời tự nhiên.

---

## Tổng quan kiến trúc

```
User input (text / text + ảnh)
        │
        ▼
LLMService (qwen3.5:9b via Ollama)
        │
        ├── search_by_text ──► PostgreSQL (filter theo code, name, color, size)
        └── search_by_image ─► CLIP encode ──► pgvector search ──► PostgreSQL
        │
        ▼
Câu trả lời tiếng Việt + lưu history vào Redis
```

- **LLM**: qwen3.5:9b chạy local qua Ollama, hỗ trợ tool calling
- **Image search**: CLIP ViT-B/32 encode ảnh → cosine similarity search với pgvector
- **Memory**: Redis lưu lịch sử hội thoại theo `user_id`, TTL 30 ngày, tối đa 30 messages/user
- **DB**: PostgreSQL + pgvector extension

> **Lưu ý**: Ảnh đầu vào hiện nhận qua **đường dẫn local** (image_path). Khi xây dựng API, cần xử lý upload file → lưu tạm → truyền path vào `LLMService.chat()`.

---

## Cấu trúc project

```
cs-agents/
├── app/
│   ├── db.py           # DatabaseService — kết nối PostgreSQL, query theo filter và vector
│   ├── embedder.py     # EmbeddingService — CLIP encode ảnh (file hoặc bytes)
│   ├── tools.py        # ToolService — search_by_text, search_by_image + schema tool cho Ollama
│   ├── memory.py       # ConversationMemory — lưu/đọc history hội thoại trên Redis
│   ├── llm.py          # LLMService — orchestrate tool calling, system prompt, trả lời
│   └── main.py         # FastAPI app
├── scripts/
│   ├── embed_products.py   # Nhập ảnh sản phẩm → CLIP encode → lưu vào DB
│   ├── test_retrieval.py   # Test vector search: ảnh → tên sản phẩm
│   └── test_chat.py        # Test flow chat với LLM
├── sql/
│   └── schema.sql      # Tạo bảng + insert sample data
├── data/
│   └── images/         # Ảnh sản phẩm, tổ chức theo mã sản phẩm
├── .env                
├── .env.example        # Template biến môi trường
├── docker-compose.yml  # PostgreSQL + pgvector, Redis, RedisInsight
└── requirements.txt
```

---

## Khởi tạo dự án

### 1. Cài đặt dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> Yêu cầu đã cài sẵn **PyTorch với CUDA 12.6**. Script sẽ tự dùng GPU nếu có.

### 2. Cấu hình môi trường

```bash
cp .env.example .env
```

### 3. Khởi động Docker (PostgreSQL + Redis)

```bash
docker compose up -d
```

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RedisInsight dashboard: `http://localhost:5540`. Truy cập vào link và tạo DB với host là redis, port 6379.

`schema.sql` được tự động chạy khi container khởi tạo lần đầu — tạo bảng và insert sample data (3 sản phẩm: A02, A03, Q01).

> Nếu cần reset DB: `docker compose down -v && docker compose up -d`

### 4. Chuẩn bị ảnh sản phẩm

Đặt ảnh vào đúng cấu trúc folder, tên subfolder phải khớp với `code` trong bảng `products`:

```
data/images/{product_code}/{1,2,...}.jpg|png
```

Ảnh đầu tiên (theo thứ tự tên file) sẽ được đánh dấu `is_primary=True` — dùng làm ảnh đại diện khi hiển thị sản phẩm.

### 5. Embed ảnh sản phẩm vào DB

```bash
python scripts/embed_products.py
```

Script đọc từng ảnh trong `data/images/`, encode bằng CLIP, lưu vector 512 chiều vào bảng `product_images`.

### 6. Cài đặt Ollama và pull model

```bash
ollama pull qwen3.5:9b

(Sử dụng model mạnh hơn nếu dư giả hiệu năng)
```

---

## Kiểm tra hệ thống

### Test vector search (ảnh → sản phẩm)

```bash
python scripts/test_retrieval.py data/images/A02/1.png
```

Output mong đợi:
```
#1 [A02] Áo thun basic cổ tròn — 150,000đ  (similarity: 0.98xnxx)
```

### Test flow chat

```bash
# Text only
python scripts/test_chat.py

# Text + ảnh đính kèm (ảnh chỉ gửi kèm lượt đầu tiên)
python scripts/test_chat.py --image data/images/A02/1.png
```

---

## Pipeline hoạt động

### Input chỉ có text
```
"Áo A02 màu đen size M còn không?"
        │
        ▼
LLM extract: code=A02, color=den, size=M
        │
        ▼
search_by_text(code="A02", color="den", size="M")
        │
        ▼
PostgreSQL trả về: stock=6
        │
        ▼
LLM reasoning
        │
        ▼
"Dạ áo thun A02 màu đen size M hiện đang hết rất nhanh rồi ạ. Bạn nhanh tay đặt trước kẻo hết nha!"
```

### Input text + ảnh (image_path local)
```
image_path="data/images/A02/1.png", text="Mẫu này còn size M không?"
        │
        ▼
[Bước 1] search_by_image(image_path="data/images/A02/1.png")
         CLIP encode ảnh → vector 512 chiều
         cosine similarity search → product: A02
        │
        ▼
[Bước 2] search_by_text(code="A02", size="M")
         PostgreSQL trả về tất cả variants size M của A02
        │
        ▼
LLM reasoning → trả lời dựa trên stock thực tế
```

> Khi xây dựng API: nhận file ảnh upload từ client → lưu vào thư mục tạm → truyền đường dẫn tuyệt đối vào `LLMService.chat(user_id, message, image_path="/tmp/xxx.jpg")` → xóa file sau khi xử lý xong. (Hỗ trợ ảnh .jpg + .png)

---

## Giao tiếp với LLMService

```python
from app.llm import LLMService

llm = LLMService()  # khởi tạo 1 lần, dùng chung

# Text only
response = llm.chat(user_id="default", user_message="Áo A02 còn không?")

# Text + ảnh
response = llm.chat(user_id="default", user_message="Mẫu này còn size M không?", image_path="/tmp/uploaded.jpg")

print(response)  # chuỗi tiếng Việt
```

Trong đó:
- `user_id`: định danh user (Zalo dùng `sender.id` từ webhook payload, mặc định là default)
- `image_path`: đường dẫn local tới file ảnh, `None` nếu không có ảnh
- History được tự động lưu/đọc từ Redis theo `user_id`
