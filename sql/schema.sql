
CREATE TABLE IF NOT EXISTS categories (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug    VARCHAR(50) UNIQUE NOT NULL,
    name    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);


CREATE TABLE IF NOT EXISTS product_variants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku        VARCHAR(50) UNIQUE NOT NULL,
    color      VARCHAR(50),
    size       VARCHAR(10),
    price      INTEGER NOT NULL CHECK (price >= 0),
    stock      INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(product_id, color, size)
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url  TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    embedding  TEXT, -- Lưu chuỗi vector khi chưa cài extension pgvector
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, image_url)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_images_primary
ON product_images(product_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zalo_user_id  VARCHAR(100) UNIQUE,
    phone         VARCHAR(15) UNIQUE,
    email         VARCHAR(255) UNIQUE,
    password_hash TEXT,
    name          TEXT,
    address       TEXT,
    note          TEXT,
    role          VARCHAR(20) NOT NULL DEFAULT 'customer',
                  -- 'customer'
    tier          VARCHAR(20) NOT NULL DEFAULT 'standard',
                  -- 'standard' | 'silver' | 'gold' | 'vip'
    skus          TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP
);


CREATE TABLE IF NOT EXISTS staff (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT,
    role          VARCHAR(20) NOT NULL DEFAULT 'staff',
                  -- 'admin' | 'staff' | 'viewer'
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP
);


CREATE TABLE IF NOT EXISTS conversations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
    zalo_user_id   VARCHAR(100) NOT NULL,
    status         VARCHAR(20) DEFAULT 'ai_handling',
                   -- 'ai_handling' | 'human_handling' | 'closed'
    is_human_mode  BOOLEAN DEFAULT FALSE,
    assigned_to    UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status   ON conversations(status);


CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
                    -- 'user' | 'assistant' | 'staff'
    content         TEXT NOT NULL,
    image_url       TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);


CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    status          VARCHAR(20) DEFAULT 'pending',
                    -- 'pending' | 'confirmed' | 'shipping' | 'done' | 'cancelled'
    note            TEXT,
    total_amount    INTEGER DEFAULT 0 CHECK (total_amount >= 0),
    assigned_to     UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);


CREATE TABLE IF NOT EXISTS order_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);


INSERT INTO categories (id, slug, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ao-thun', 'Áo thun'),
    ('22222222-2222-2222-2222-222222222222', 'quan-jeans', 'Quần Jeans')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO staff (id, email, password_hash, full_name, role) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@shop.com', 'hashed_pw_123', 'Quản Lý Shop', 'admin'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'staff@shop.com', 'hashed_pw_123', 'Nhân Viên Tư Vấn', 'staff')
ON CONFLICT (email) DO NOTHING;


INSERT INTO products (id, code, name, category_id, description, is_active) VALUES
    ('33333333-3333-3333-3333-333333333333', 'A02', 'Áo thun basic cổ tròn', '11111111-1111-1111-1111-111111111111', 'Chất liệu 100% cotton thoáng mát, form rộng unisex', TRUE),
    ('44444444-4444-4444-4444-444444444444', 'Q01', 'Quần Jean ống suông', '22222222-2222-2222-2222-222222222222', 'Vải denim cao cấp bền màu, kiểu dáng trẻ trung', TRUE)
ON CONFLICT (code) DO NOTHING;


INSERT INTO product_variants (product_id, sku, color, size, price, stock, is_active) VALUES
    ('33333333-3333-3333-3333-333333333333', 'A02-DEN-M', 'Đen', 'M', 150000, 20, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'A02-DEN-L', 'Đen', 'L', 150000, 15, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'A02-TRANG-M', 'Trắng', 'M', 150000, 30, TRUE),
    ('44444444-4444-4444-4444-444444444444', 'Q01-XANH-29', 'Xanh nhạt', '29', 320000, 12, TRUE),
    ('44444444-4444-4444-4444-444444444444', 'Q01-XANH-30', 'Xanh nhạt', '30', 320000, 8, TRUE)
ON CONFLICT (product_id, color, size) DO NOTHING;


INSERT INTO customers (id, zalo_user_id, phone, name, address, skus) VALUES
    ('55555555-5555-5555-5555-555555555555', 'zalo_user_01', '0901234567', 'Nguyễn Văn An', '123 Lê Lợi, P. Bến Nghé, Quận 1, TP.HCM', ARRAY['A02-DEN-M']),
    ('66666666-6666-6666-6666-666666666666', 'zalo_user_02', '0987654321', 'Trần Thị Bình', '456 Cầu Giấy, Hà Nội', ARRAY['Q01-XANH-29'])
ON CONFLICT (phone) DO NOTHING;
