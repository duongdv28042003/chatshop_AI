from app.db import DatabaseService
from app.embedder import EmbeddingService

class ToolService:
    def __init__(self):
        self.db_service = DatabaseService()
        self._embed_service = None

    @property
    def embed_service(self):
        if self._embed_service is None:
            self._embed_service = EmbeddingService()
        return self._embed_service

    def search_by_text(self, code: str = None, name: str = None, color: str = None, size: str = None) -> dict:
        rows = self.db_service.query_by_filters(code=code, name=name, color=color, size=size)
        if not rows:
            return {"found": False, "message": "Không tìm thấy sản phẩm phù hợp."}

        return {"found": True, "results": rows}

    def search_by_image(self, image_path: str = None, image_bytes: bytes = None) -> dict:
        if not image_path and not image_bytes:
            return {"found": False, "message": "Không có ảnh đầu vào."}

        try:
            if image_path:
                embedding = self.embed_service.embed_image_file(image_path)
            else:
                embedding = self.embed_service.embed_image_bytes(image_bytes)
        except (OSError, ValueError):
            return {"found": False, "message": "Ảnh không hợp lệ hoặc không thể đọc."}

        rows = self.db_service.query_by_vector(embedding, top_k=1)
        if not rows or rows[0]["similarity"] < 0.9:
            return {"found": False, "message": "Không tìm thấy sản phẩm tương tự."}

        return {"found": True, "results": rows}
