import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

LLM_MODEL = os.getenv("LLM_MODEL", "ollama/qwen3.5:9b")

ZALO_OA_TOKEN = os.getenv("ZALO_OA_TOKEN")
