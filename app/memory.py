import json
import redis
from app.config import REDIS_URL

MAX_HISTORY = 30
LLM_CONTEXT = 20
TTL_SECONDS = 30 * 24 * 3600

class ConversationMemory:
    def __init__(self):
        self._redis_available = False
        self._local_memory: dict[str, list[dict]] = {}
        try:
            self._client = redis.from_url(REDIS_URL, socket_timeout=1.0)
            self._client.ping()
            self._redis_available = True
        except Exception:
            self._redis_available = False

    def _key(self, user_id: str) -> str:
        return f"chat:{user_id}"

    def append(self, user_id: str, role: str, content: str) -> None:
        if self._redis_available:
            try:
                key = self._key(user_id)
                message = json.dumps({"role": role, "content": content}, ensure_ascii=False)
                pipe = self._client.pipeline()
                pipe.rpush(key, message)
                pipe.ltrim(key, -MAX_HISTORY, -1)
                pipe.expire(key, TTL_SECONDS)
                pipe.execute()
                return
            except Exception:
                self._redis_available = False

        if user_id not in self._local_memory:
            self._local_memory[user_id] = []
        self._local_memory[user_id].append({"role": role, "content": content})
        if len(self._local_memory[user_id]) > MAX_HISTORY:
            self._local_memory[user_id] = self._local_memory[user_id][-MAX_HISTORY:]

    def get_context(self, user_id: str) -> list[dict]:
        if self._redis_available:
            try:
                key = self._key(user_id)
                messages = self._client.lrange(key, -LLM_CONTEXT, -1)
                return [json.loads(m) for m in messages]
            except Exception:
                self._redis_available = False

        return self._local_memory.get(user_id, [])[-LLM_CONTEXT:]

    def clear(self, user_id: str) -> None:
        if self._redis_available:
            try:
                self._client.delete(self._key(user_id))
            except Exception:
                pass
        self._local_memory.pop(user_id, None)
