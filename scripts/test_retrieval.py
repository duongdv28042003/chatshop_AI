"""
Test vector search: given an image, find the most similar product.
Usage: python scripts/test_retrieval.py <image_path>
"""

import os
import sys
from pathlib import Path

import clip
import psycopg2
import torch
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)


def embed_image(path: Path) -> list[float]:
    image = preprocess(Image.open(path)).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model.encode_image(image)
        features /= features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy()[0].tolist()


def search(image_path: str):
    embedding = embed_image(Path(image_path))

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.code, p.name, pi.image_url,
               (SELECT MIN(pv.price) FROM product_variants pv
                WHERE pv.product_id = p.id) AS price,
               1 - (pi.embedding <=> %s::vector) AS similarity
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        ORDER BY pi.embedding <=> %s::vector
        LIMIT 1
        """,
        (embedding, embedding),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_retrieval.py <image_path>")
        sys.exit(1)

    results = search(sys.argv[1])
    print(f"\nTop {len(results)} results:")
    print("-" * 50)
    for rank, (code, name, price, image_url, similarity) in enumerate(results, 1):
        print(f"#{rank} [{code}] {name} — {price:,}đ  (similarity: {similarity:.4f})")
        print(f"    {image_url}")
