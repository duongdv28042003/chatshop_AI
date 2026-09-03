"""
Embed product images into DB.
Usage: python scripts/embed_products.py

Folder structure: data/images/{product_code}/{1,2,...}.jpg
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

IMAGES_DIR = Path(__file__).parent.parent / "data" / "images"
DATABASE_URL = os.getenv("DATABASE_URL")

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)


def embed_image(path: Path) -> list[float]:
    image = preprocess(Image.open(path)).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model.encode_image(image)
        features /= features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy()[0].tolist()


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    product_dirs = sorted(IMAGES_DIR.iterdir())
    if not product_dirs:
        print("No product folders found in data/images/")
        sys.exit(1)

    for product_dir in product_dirs:
        if not product_dir.is_dir():
            continue

        code = product_dir.name
        cur.execute("SELECT id FROM products WHERE code = %s", (code,))
        row = cur.fetchone()
        if not row:
            print(f"[SKIP] Product code '{code}' not found in DB")
            continue

        product_id = row[0]
        image_files = sorted(product_dir.glob("*.jpg")) + sorted(product_dir.glob("*.png"))

        if not image_files:
            print(f"[SKIP] No images in {product_dir}")
            continue

        for i, img_path in enumerate(image_files):
            embedding = embed_image(img_path)
            is_primary = (i == 0)

            cur.execute(
                """
                INSERT INTO product_images (product_id, image_url, is_primary, embedding)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (product_id, str(img_path), is_primary, embedding),
            )
            print(f"[OK] {code}/{img_path.name} → embedded (primary={is_primary})")

        conn.commit()

    cur.close()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
