import psycopg2
import psycopg2.extras

from app.config import DATABASE_URL

class DatabaseService:
    def __init__(self):
        self._url = DATABASE_URL

    def _get_conn(self):
        return psycopg2.connect(self._url)

    def close(self):
        pass

    def query_by_filters(self, code: str = None, name: str = None, color: str = None, size: str = None) -> list[dict]:
        conditions = []
        params = []

        if code:
            conditions.append("p.code ILIKE %s")
            params.append(code)
        if name:
            conditions.append("p.name ILIKE %s")
            params.append(f"%{name}%")
        if color:
            conditions.append("pv.color ILIKE %s")
            params.append(color)
        if size:
            conditions.append("pv.size ILIKE %s")
            params.append(size)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        sql = f"""
            SELECT p.code, p.name, c.slug AS category, p.description,
                pv.sku, pv.color, pv.size, pv.price, pv.stock
            FROM products p
            LEFT JOIN product_variants pv ON pv.product_id = p.id
            LEFT JOIN categories c ON c.id = p.category_id
            {where}
            ORDER BY p.code, pv.color, pv.size
        """

        with self._get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                return [dict(r) for r in cur.fetchall()]

    def query_by_vector(self, embedding: list[float], top_k: int = 1) -> list[dict]:
        sql = """
            SELECT p.id, p.code, p.name, p.price,
                1 - (pi.embedding <=> %s::vector) AS similarity
            FROM product_images pi
            JOIN products p ON p.id = pi.product_id
            ORDER BY pi.embedding <=> %s::vector
            LIMIT %s
        """
        with self._get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, (embedding, embedding, top_k))
                return [dict(r) for r in cur.fetchall()]

    def save_zalo_message(self, zalo_user_id: str, role: str, content: str, image_url: str = None) -> None:
        """Lưu tin nhắn Zalo vào PostgreSQL để đồng bộ với Dashboard."""
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:

                    cur.execute("SELECT id FROM customers WHERE zalo_user_id = %s", (zalo_user_id,))
                    row = cur.fetchone()
                    if row:
                        customer_id = row[0]
                    else:
                        cur.execute(
                            "INSERT INTO customers (zalo_user_id, name, role, tier) VALUES (%s, %s, 'customer', 'standard') RETURNING id",
                            (zalo_user_id, f"Khách Zalo {zalo_user_id[:6]}")
                        )
                        customer_id = cur.fetchone()[0]

                    cur.execute(
                        "SELECT id FROM conversations WHERE zalo_user_id = %s AND status != 'closed' ORDER BY created_at DESC LIMIT 1",
                        (zalo_user_id,)
                    )
                    conv_row = cur.fetchone()
                    if conv_row:
                        conv_id = conv_row[0]
                    else:
                        cur.execute(
                            "INSERT INTO conversations (customer_id, zalo_user_id, status) VALUES (%s, %s, 'ai_handling') RETURNING id",
                            (customer_id, zalo_user_id)
                        )
                        conv_id = cur.fetchone()[0]

                    cur.execute(
                        "INSERT INTO messages (conversation_id, role, content, image_url) VALUES (%s, %s, %s, %s)",
                        (conv_id, role, content, image_url)
                    )

                    cur.execute("UPDATE conversations SET updated_at = NOW() WHERE id = %s", (conv_id,))
                conn.commit()
        except Exception as e:
            print(f"Error saving Zalo message to DB: {e}")
