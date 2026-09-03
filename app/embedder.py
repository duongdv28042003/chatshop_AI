from pathlib import Path

import torch
from PIL import Image

class EmbeddingService:
    def __init__(self):
        import clip
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)

    def embed_image_file(self, path: str | Path) -> list[float]:
        with Image.open(path) as img:
            return self._embed(img)

    def embed_image_bytes(self, data: bytes) -> list[float]:
        from io import BytesIO
        with Image.open(BytesIO(data)) as img:
            return self._embed(img)

    def _embed(self, pil_image: Image.Image) -> list[float]:
        image = self.preprocess(pil_image).unsqueeze(0).to(self.device)
        with torch.inference_mode():
            features = self.model.encode_image(image)
            features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy()[0].tolist()
