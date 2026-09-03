import os
import json
import re
import socket
import litellm

from app.config import LLM_MODEL
from app.memory import ConversationMemory
from app.static_prompt import SYSTEM_PROMPT, TOOLS
from app.tools import ToolService

def is_ollama_alive() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", 11434), timeout=0.3):
            return True
    except Exception:
        return False

class LLMService:
    def __init__(self):
        self._model_name = LLM_MODEL
        self._memory = ConversationMemory()
        self._tools = ToolService()
        self._tool_map = {
            "search_by_text": self._tools.search_by_text,
            "search_by_image": self._tools.search_by_image,
        }

    def _call_llm(self, messages: list) -> object:
        return litellm.completion(
            model=self._model_name,
            messages=messages,
            tools=TOOLS,
            timeout=10.0,
            num_retries=0,
        )

    def _rule_based_fallback(self, user_id: str, user_message: str) -> str:
        text = user_message.lower()

        height_match = re.search(r'(?:cao\s*)?(\d+)[m,.](\d+)|(\d{3})\s*(?:cm)?', text)
        weight_match = re.search(r'(?:nặng\s*)?(\d+)\s*(?:kg|kí|ký)?', text)

        height_cm = None
        if height_match:
            if height_match.group(1) and height_match.group(2):
                height_cm = int(height_match.group(1)) * 100 + int(height_match.group(2).ljust(2, '0')[:2])
            elif height_match.group(3):
                height_cm = int(height_match.group(3))

        weight_kg = None
        if weight_match:
            weight_val = int(weight_match.group(1))
            if 30 <= weight_val <= 150:
                weight_kg = weight_val

        if height_cm or weight_kg:
            h = height_cm or 165
            w = weight_kg or 55

            if h <= 158 and w <= 48:
                size = "S"
            elif h <= 165 and w <= 58:
                size = "M"
            elif h <= 170 and w <= 68:
                size = "L"
            elif h <= 175 and w <= 78:
                size = "XL"
            else:
                size = "XXL"

            h_str = f"{h/100:.2f}m".replace(".", "m") if height_cm else ""
            w_str = f"{w}kg" if weight_kg else ""
            info_str = f"chiều cao {h_str}" if h_str and not w_str else f"cân nặng {w_str}" if w_str and not h_str else f"chiều cao {h_str} và cân nặng {w_str}"

            return f"Dạ với {info_str}, bạn mặc **size {size}** sẽ vừa vặn và đẹp nhất ạ! Nếu bạn muốn mặc rộng rãi thoải mái hơn thì có thể chọn tăng lên một size nha 💕"

        if any(kw in text for kw in ["tư vấn size", "chọn size", "size nào", "size gì", "mặc size"]):
            return "Dạ để tư vấn size chuẩn nhất cho bạn, bạn cho mình biết chiều cao và cân nặng của bạn được không ạ?"

        code_match = re.search(r'\b(a\d+|q\d+)\b', text)
        code = code_match.group(1).upper() if code_match else None

        name = None
        if "áo thun" in text or "áo" in text:
            name = "áo thun"
        elif "jean" in text or "quần" in text:
            name = "jean"

        color = None
        for c in ["đen", "trắng", "hồng", "xanh nhạt", "xanh"]:
            if c in text:
                color = c
                break

        size_req = None
        for s in ["xxl", "xl", "s", "m", "l", "29", "30", "31", "32"]:
            if re.search(rf'\b{s}\b', text):
                size_req = s.upper()
                break

        if code or name:
            res = self._tools.search_by_text(code=code, name=name, color=color, size=size_req)
            if res.get("found") and res.get("results"):
                item = res["results"][0]
                item_name = item.get("name", "Sản phẩm")
                item_color = item.get("color", "")
                item_size = item.get("size", "")
                stock = item.get("stock", 0)
                price = item.get("price", 0)
                price_str = f"{int(price):,}đ".replace(",", ".")

                desc = f"{item_name}"
                if item_color: desc += f" màu {item_color}"
                if item_size: desc += f" size {item_size}"

                if stock > 10:
                    return f"Dạ {desc} bên mình vẫn còn hàng ạ (giá {price_str}). Bạn có muốn đặt luôn không ạ?"
                elif stock > 0:
                    return f"Dạ {desc} hiện đang hết rất nhanh rồi ạ (giá {price_str}). Bạn nhanh tay đặt trước kẻo hết nha!"
                else:
                    return f"Dạ bên mình rất tiếc là {desc} hiện đã tạm hết hàng rồi ạ. Shop xin lỗi bạn nhé, bên mình sẽ sớm nhập thêm. Bạn có muốn xem màu hoặc size khác không ạ?"

        if any(kw in text for kw in ["đặt", "mua", "lấy cái", "chốt"]):
            phone_match = re.search(r'0\d{9,10}', text)
            if not phone_match:
                return "Dạ bạn muốn đặt hàng đúng không ạ? Bạn cho mình xin họ tên, số điện thoại và địa chỉ nhận hàng để bên mình hỗ trợ lên đơn ngay nhé!"
            else:
                return "Dạ mình đã ghi nhận thông tin đặt hàng của bạn rồi ạ! Nhân viên bên mình sẽ liên hệ với bạn sớm nhất để xác nhận đơn hàng nhé. Cảm ơn bạn đã tin tưởng Shop!"

        return "Dạ em chào anh/chị ạ! Em là Trợ Lý AI của Fashion Shop. Em có thể hỗ trợ mình tư vấn size chuẩn, kiểm tra mẫu áo thun basic A02 hoặc quần jean Q01 ngay ạ!"

    def chat(self, user_id: str, user_message: str, image_path: str = None) -> str:
        self._memory.append(user_id, "user", user_message)

        answer = ""
        should_use_llm = False
        if self._model_name.startswith("ollama"):
            should_use_llm = is_ollama_alive()
        elif any(k in os.environ for k in ["OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"]):
            should_use_llm = True

        if should_use_llm:
            try:
                messages = [{"role": "system", "content": SYSTEM_PROMPT}]
                messages += self._memory.get_context(user_id)

                if image_path:
                    messages[-1]["content"] = f"{user_message}\n[image_path: {image_path}]"

                response = self._call_llm(messages)

                while response.choices[0].message.tool_calls:
                    assistant_message = response.choices[0].message
                    messages.append(assistant_message)

                    for tool_call in assistant_message.tool_calls:
                        fn_name = tool_call.function.name
                        raw_args = tool_call.function.arguments or {}
                        fn_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args

                        tool_result = self._tool_map[fn_name](**fn_args)

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(tool_result, ensure_ascii=False),
                        })

                    response = self._call_llm(messages)

                answer = response.choices[0].message.content or ""
            except Exception:
                answer = self._rule_based_fallback(user_id, user_message)
        else:
            answer = self._rule_based_fallback(user_id, user_message)

        self._memory.append(user_id, "assistant", answer)
        return answer
