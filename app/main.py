import httpx
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from app.config import ZALO_OA_TOKEN
from app.db import DatabaseService
from app.llm import LLMService

app = FastAPI(title="Fashion Shop AI & Zalo OA Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_service = None
db_service = DatabaseService()

def get_llm_service():
    global llm_service
    if llm_service is None:
        try:
            llm_service = LLMService()
        except Exception as e:
            print(f"Warning: Could not initialize LLMService: {e}")
    return llm_service

async def send_zalo_message(zalo_user_id: str, text: str) -> None:
    if not ZALO_OA_TOKEN or ZALO_OA_TOKEN == "your_zalo_oa_token":
        print(f"[Zalo Mock] Would send to user {zalo_user_id}: {text}")
        return

    url = "https://openapi.zalo.me/v3.0/oa/message/cs"
    headers = {
        "access_token": ZALO_OA_TOKEN,
        "Content-Type": "application/json"
    }
    payload = {
        "recipient": {
            "user_id": zalo_user_id
        },
        "message": {
            "text": text
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=payload, timeout=10.0)
            res_data = res.json()
            if res_data.get("error") != 0:
                print(f"[Zalo API Error] {res_data}")
            else:
                print(f"[Zalo Sent] Successfully sent to {zalo_user_id}")
    except Exception as e:
        print(f"[Zalo Send Exception] {e}")

async def process_zalo_event(event_data: dict) -> None:
    event_name = event_data.get("event_name", "")
    sender = event_data.get("sender", {})
    zalo_user_id = str(sender.get("id", ""))

    if not zalo_user_id:
        return

    user_text = ""
    image_url = None

    if event_name == "user_send_text":
        user_text = event_data.get("message", {}).get("text", "").strip()
    elif event_name == "user_send_image":
        attachments = event_data.get("message", {}).get("attachments", [])
        if attachments:
            image_url = attachments[0].get("payload", {}).get("url")
            user_text = "Khách gửi một hình ảnh sản phẩm"
    else:
        return

    if not user_text and not image_url:
        return

    print(f"📩 [Zalo Webhook Received] User {zalo_user_id}: {user_text}")

    db_service.save_zalo_message(zalo_user_id, role="user", content=user_text, image_url=image_url)

    service = get_llm_service()
    ai_reply = ""
    if service:
        try:
            ai_reply = service.chat(
                user_id=zalo_user_id,
                user_message=user_text,
                image_path=image_url
            )
        except Exception as e:
            print(f"LLM Error for Zalo: {e}")
            ai_reply = "Dạ em chào mình ạ! Bé AI của shop đang bận một chút, nhân viên sẽ liên hệ hỗ trợ mình ngay nhé!"
    else:
        ai_reply = "Dạ em chào mình ạ! Shop hiện có sẵn các mẫu Áo thun basic A02 và Quần Jean ống suông Q01. Anh/chị cần tư vấn size hay xem mẫu nào ạ?"

    db_service.save_zalo_message(zalo_user_id, role="assistant", content=ai_reply)
    await send_zalo_message(zalo_user_id, ai_reply)

@app.post("/webhook/zalo")
@app.post("/api/zalo/webhook")
async def zalo_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        body = await request.json()
    except Exception:
        body = {}

    background_tasks.add_task(process_zalo_event, body)
    return {"error": 0, "message": "Success"}

class ChatRequest(BaseModel):
    user_id: str
    message: str
    image_path: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "fashion-ai-zalo-service"}

@app.post("/api/ai/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    service = get_llm_service()
    if not service:
        return ChatResponse(
            reply="Dạ em chào mình ạ! Em là Trợ Lý AI của Fashion Shop. Shop hiện có sẵn mẫu Áo thun basic (A02) và Quần Jean ống suông (Q01). Anh/chị cần em tư vấn size hay thông tin sản phẩm nào ạ?"
        )

    try:
        answer = service.chat(
            user_id=req.user_id,
            user_message=req.message,
            image_path=req.image_path
        )
        return ChatResponse(reply=answer)
    except Exception as e:
        print(f"LLM Chat error: {e}")
        return ChatResponse(
            reply=f"Dạ em đã nhận được yêu cầu: '{req.message}'. Em có thể giúp mình kiểm tra tồn kho các mẫu áo thun A02 hoặc quần jean Q01 ngay ạ!"
        )

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
