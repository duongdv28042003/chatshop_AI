import os
import json
import re
import socket
import unicodedata
import litellm

from app.config import LLM_MODEL
from app.memory import ConversationMemory
from app.static_prompt import SYSTEM_PROMPT, TOOLS
from app.tools import ToolService

# ─────────────────────────────────────────────────────────────────
# Vietnamese diacritics removal for fuzzy matching
# "đổi trả" → "doi tra", "áo thun" → "ao thun"
# ─────────────────────────────────────────────────────────────────
_VIET_SPECIAL = str.maketrans({"đ": "d", "Đ": "D"})

def remove_diacritics(text: str) -> str:
    """Remove Vietnamese diacritics: 'đổi trả' → 'doi tra'."""
    text = text.translate(_VIET_SPECIAL)
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _match_keywords(text: str, text_no_accent: str, keywords: list[str]) -> bool:
    """Match keywords against both accented and non-accented text with boundary protection for single words."""
    for kw in keywords:
        kw = kw.strip()
        if not kw:
            continue
        if " " not in kw:
            pattern = rf"(?:\b|^){re.escape(kw)}(?:\b|$)"
            if re.search(pattern, text, re.IGNORECASE):
                return True
            kw_no_accent = remove_diacritics(kw)
            pattern_no = rf"(?:\b|^){re.escape(kw_no_accent)}(?:\b|$)"
            if re.search(pattern_no, text_no_accent, re.IGNORECASE):
                return True
        else:
            if kw in text:
                return True
            kw_no_accent = remove_diacritics(kw)
            if kw_no_accent != kw and kw_no_accent in text_no_accent:
                return True
    return False


def is_ollama_alive() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", 11434), timeout=0.3):
            return True
    except Exception:
        return False

# ─────────────────────────────────────────────────────────────────
# FAQ — Câu hỏi thường gặp, trả lời ngay không cần gọi tool/LLM
# ─────────────────────────────────────────────────────────────────
FAQ_PATTERNS: list[tuple[list[str], str]] = [
    # ── Chào hỏi ──
    (
        ["xin chào", "chào shop", "hello", "hi shop", "shop ơi", "alo", "chào bạn", "hey"],
        "Dạ chào bạn! Em là Trợ Lý AI của Fashion Shop ✨ Bạn cần em hỗ trợ tư vấn sản phẩm gì ạ?"
    ),
    # ── Vận chuyển ──
    (
        ["ship bao lâu", "giao hàng", "bao lâu nhận", "mấy ngày nhận", "giao trong bao lâu",
         "ship mất", "phí ship", "phí vận chuyển", "freeship", "free ship", "miễn phí ship"],
        "Dạ bên mình giao hàng COD toàn quốc ạ! Nội thành 1-2 ngày, ngoại thành 3-5 ngày. "
        "Phí ship tùy khu vực, thường từ 20-40k (đơn từ 500k freeship ạ). Bạn cần đặt mẫu nào không ạ?"
    ),
    # ── Kiểm tra hàng / Đồng kiểm (đặt trước đổi trả để tránh nhầm "kiểm tra hàng" với "trả hàng") ──
    (
        ["kiểm tra hàng", "xem hàng trước", "cho xem hàng", "đồng kiểm", "mở hàng", "kiem tra hang", "xem hang", "co duoc xem", "co duoc kiem tra"],
        "Dạ shop luôn cho phép bạn đồng kiểm, kiểm tra hàng thoải mái trước khi thanh toán cho shipper ạ! "
        "Đúng mẫu, đúng size, chuẩn chất lượng bạn mới nhận nên hoàn toàn an tâm nha ✨"
    ),
    # ── Đổi trả ──
    (
        ["đổi trả", "đổi trả hàng", "trả lại hàng", "hoàn trả", "đổi hàng", "đổi size", "đổi màu",
         "bảo hành", "hàng lỗi", "không vừa", "sai size", "sai màu", "trả lại", "doi tra"],
        "Dạ bên mình hỗ trợ đổi trả trong 7 ngày nếu sản phẩm lỗi hoặc không vừa size (giữ nguyên tem mác) ạ. "
        "Bạn liên hệ hotline 0812084494 hoặc nhắn tin ở đây để em hỗ trợ đổi nhanh nhất nhé!"
    ),
    # ── Thanh toán ──
    (
        ["thanh toán", "trả tiền", "chuyển khoản", "cod", "tiền mặt", "banking",
         "stk", "số tài khoản", "qr code"],
        "Dạ shop hỗ trợ 2 hình thức thanh toán tiện lợi ạ:\n"
        "1. **COD** – Nhận hàng kiểm tra rồi mới thanh toán tiền mặt cho shipper\n"
        "2. **Chuyển khoản / Quét mã VietQR** – Khi bạn xác nhận đơn hàng\n"
        "Bạn muốn thanh toán theo hình thức nào ạ?"
    ),
    # ── Khuyến mãi ──
    (
        ["khuyến mãi", "giảm giá", "sale", "ưu đãi", "voucher", "mã giảm", "discount",
         "combo", "mua nhiều"],
        "Dạ bên mình đang áp dụng chương trình ưu đãi:\n"
        "• Mua từ 3 sản phẩm: **giảm ngay 10%**\n"
        "• Mua từ 5 sản phẩm: **giảm ngay 15%** + freeship\n"
        "Bạn cần em tư vấn combo nào mặc đẹp mà tiết kiệm nhất không ạ? 💕"
    ),
    # ── Giờ hoạt động ──
    (
        ["giờ mở cửa", "mấy giờ", "làm việc", "hoạt động", "mở cửa", "đóng cửa"],
        "Dạ shop hoạt động từ 8h - 21h hàng ngày ạ. Còn em Trợ Lý AI trực 24/7, "
        "bạn nhắn lúc nào cũng có em hỗ trợ ngay nhé!"
    ),
    # ── Giao hỏa tốc / Ship gấp ──
    (
        ["hỏa tốc", "giao gấp", "ship gấp", "trong ngày", "nhận luôn", "grab", "ahamove", "ngay bây giờ", "hoa toc"],
        "Dạ khu vực nội thành shop có hỗ trợ giao hỏa tốc nhận trong 1-2 tiếng qua Grab/Ahamove ạ! "
        "Bạn cho em xin địa chỉ cụ thể và SĐT để shop kiểm tra phí ship hỏa tốc cho bạn nhé!"
    ),
    # ── Chất liệu vải / Giặt ủi ──
    (
        ["chất liệu", "vải gì", "co giãn", "xù lông", "phai màu", "giặt máy", "chất vải", "thoáng mát", "cotton"],
        "Dạ các sản phẩm bên shop đa phần làm từ Cotton 100% cao cấp hoặc vải dệt xuất khẩu, "
        "co giãn tốt, thấm hút mồ hôi và không lo xù lông hay phai màu ạ. Giặt máy thoải mái (bạn lộn trái áo khi giặt để giữ form bền nhất nhé)!"
    ),
    # ── Ảnh thật / Feedback ──
    (
        ["ảnh thật", "hình thật", "ảnh mẫu", "feedback", "chụp thật", "video thật", "anh that", "hinh that", "y hình"],
        "Dạ toàn bộ ảnh và video trên website đều do người mẫu shop tự chụp 100% ạ! "
        "Cam kết sản phẩm thực tế y hình từ form dáng đến màu sắc bạn nha 💕"
    ),
    # ── Địa chỉ / Cửa hàng ──
    (
        ["shop ở đâu", "địa chỉ", "cửa hàng", "chi nhánh", "xem trực tiếp", "qua shop", "shop o dau", "dia chi"],
        "Dạ hiện tại shop chủ yếu phân phối online và có 2 kho hàng tại Hà Nội và TP.HCM ạ. "
        "Bạn đặt hàng sẽ được giao tận nơi và kiểm tra hàng trước khi trả tiền nên rất tiện lợi và yên tâm nha!"
    ),
    # ── Tư vấn phối đồ / Outfit ──
    (
        ["phối đồ", "mix đồ", "mặc với gì", "mặc với", "mặc cùng", "phối cùng", "kết hợp với", "mix với", "outfit", "phối với", "hợp với", "phoi do", "mix do", "mac voi"],
        "Dạ em gợi ý bạn vài cách phối siêu đẹp và trendy nhé:\n"
        "• Áo thun / Polo + Quần Jean ống suông hoặc Short: Trẻ trung, năng động hàng ngày\n"
        "• Sơ mi + Quần Tây xếp ly hoặc Jean Slimfit: Lịch lãm, công sở, đi tiệc\n"
        "• Áo khoác Bomber / Blazer khoác ngoài áo thun basic: Cá tính, thời thượng\n"
        "Bạn đang cần phối đồ đi làm, đi học hay đi chơi ạ?"
    ),
    # ── Form dáng / Oversize / Regular ──
    (
        ["form rộng", "oversize", "ôm body", "slimfit", "form gì", "dáng rộng", "form ao", "dang ao"],
        "Dạ các dòng áo thun, hoodie bên em chuẩn form Regular/Oversize trẻ trung, thoải mái che khuyết điểm rất tốt. "
        "Còn sơ mi, polo và quần tây thì may form Regular-Fit vừa vặn lịch sự ạ. Bạn thích phong cách mặc rộng hay vừa người ạ?"
    ),
    # ── Giới tính / Unisex ──
    (
        ["nam hay nữ", "con gái mặc được không", "nữ mặc được", "unisex", "đồ nam", "đồ nữ", "nam nu"],
        "Dạ các mẫu áo thun, polo, hoodie và áo khoác bên em đều thiết kế phong cách **Unisex**, cả bạn nam và bạn nữ mặc đều rất đẹp và cá tính ạ! "
        "Bạn chỉ cần chọn size theo chiều cao/cân nặng là chuẩn đẹp nha 💕"
    ),
    # ── Mua sỉ / Bán sỉ / Số lượng lớn ──
    (
        ["mua sỉ", "bán sỉ", "giá sỉ", "số lượng lớn", "đồng phục", "lấy sỉ", "chính sách sỉ", "mua si", "ban si", "gia si", "mua buôn", "bán buôn"],
        "Dạ shop có chính sách chiết khấu rất tốt cho khách lấy sỉ từ 10 sản phẩm hoặc may đồng phục team/lớp ạ! "
        "Bạn kết nối Zalo hotline **0812084494** để nhận bảng báo giá sỉ ưu đãi nhất nhé!"
    ),
    # ── Liên hệ / Hotline / Người thật ──
    (
        ["gặp nhân viên", "hotline", "số điện thoại", "gọi điện", "người thật", "zalo", "sdt", "lien he", "nhan vien"],
        "Dạ bạn có thể liên hệ trực tiếp nhân viên qua:\n"
        "• Hotline / Zalo: **0812084494**\n"
        "Hoặc bạn cứ để lại câu hỏi tại đây, em AI sẽ hỗ trợ bạn ngay lập tức 24/7 ạ!"
    ),
    # ── Đặt cọc / Giữ hàng ──
    (
        ["đặt cọc", "có cần cọc", "giữ hàng", "cọc trước", "dat coc", "giu hang"],
        "Dạ mua hàng bên shop **không cần đặt cọc trước** ạ! Bạn chỉ cần để lại thông tin nhận hàng, shop sẽ gửi COD tận nơi và bạn kiểm tra rồi mới thanh toán nha."
    ),
    # ── Quà tặng / Gói quà ──
    (
        ["gói quà", "tặng bạn", "tặng quà", "viết thiệp", "sinh nhật", "mua tang", "goi qua"],
        "Dạ shop có hỗ trợ đóng hộp quà sang trọng và viết thiệp chúc mừng miễn phí cho bạn luôn ạ! "
        "Khi đặt hàng bạn chỉ cần ghi chú hoặc nhắn nội dung thiệp cho em nhé 💕"
    ),
    # ── Tra cứu đơn hàng ──
    (
        ["tra cứu đơn", "kiểm tra đơn", "tình trạng đơn", "đơn hàng của mình", "khi nào tới", "mã vận đơn", "tra cuu don", "kiem tra don"],
        "Dạ bạn cho em xin số điện thoại đã đặt hàng để em kiểm tra tiến độ giao hàng cho bạn ngay nhé!"
    ),
    # ── Kênh mua khác (Shopee, TikTok) ──
    (
        ["shopee", "tiktok", "lazada", "link shop", "sàn thương mại"],
        "Dạ bạn có thể đặt hàng trực tiếp ngay trên website/chat này để được giá tốt nhất và hỗ trợ nhanh nhất ạ! "
        "Ngoài ra shop cũng có gian hàng chính hãng trên Shopee và TikTok Shop với tên Fashion Shop bạn nhé."
    ),
    # ── Cảm ơn / Tạm biệt ──
    (
        ["cảm ơn", "thank", "thanks", "tks", "ok cảm ơn", "cám ơn", "cam on"],
        "Dạ không có gì ạ! Cảm ơn bạn đã ghé thăm shop. Khi nào cần tư vấn thêm cứ nhắn em nha! 💕"
    ),
    (
        ["tạm biệt", "bye", "bye bye", "bai bai", "thôi nhé", "tam biet"],
        "Dạ hẹn gặp lại bạn! Chúc bạn một ngày thật vui vẻ và nhiều may mắn nhé! 💕"
    ),
    # ── Khiếu nại ──
    (
        ["hàng xấu", "chất lượng kém", "không hài lòng", "tệ quá", "dở quá", "thất vọng",
         "lừa đảo", "scam", "fake", "hang xau", "lua dao"],
        "Dạ em rất xin lỗi về trải nghiệm chưa được trọn vẹn của bạn! "
        "Em sẽ chuyển thông tin ngay tới quản lý qua hotline 0812084494 để hỗ trợ bạn xử lý thỏa đáng nhất ạ!"
    ),
]


# ─────────────────────────────────────────────────────────────────
# Từ đồng nghĩa cho tên sản phẩm - fuzzy matching
# ─────────────────────────────────────────────────────────────────
PRODUCT_ALIASES: list[tuple[list[str], str]] = [
    (["sơ mi", "so mi", "oxford", "flannel", "cuba", "somi", "áo sơ mi"], "sơ mi"),
    (["polo", "po lo", "áo polo"], "polo"),
    (["blazer", "vest", "gilê", "gile"], "blazer"),
    (["cardigan", "car di gan"], "cardigan"),
    (["hoodie", "hudi", "hu đi", "áo nỉ", "sweater", "sweatshirt"], "hoodie"),
    (["bomber", "áo khoác", "khoác", "gió", "windbreaker", "khoac", "bom bơ", "áo gió", "jacket"], "khoác"),
    (["áo len", "len", "cổ lọ", "ao len"], "len"),
    (["áo thun", "áo phông", "t-shirt", "tee", "ao thun", "phong", "tshirt"], "áo thun"),
    (["quần short", "short", "sooc", "quần đùi", "quan short", "sọt"], "short"),
    (["quần tây", "quần âu", "xếp ly", "quan tay", "tay", "quan au", "âu"], "quần tây"),
    (["quần kaki", "kaki", "chino", "quan kaki"], "kaki"),
    (["jogger", "quần jogger"], "jogger"),
    (["quần jean", "quần bò", "jean", "denim", "baggy", "quan jean", "jeans", "bò", "ống suông", "slimfit"], "jean"),
    (["đầm", "váy", "vintage", "dam", "vay", "chân váy", "skirt"], "váy"),
    (["quần túi hộp", "cargo", "túi hộp", "quan cargo"], "cargo"),
    (["phụ kiện", "nón", "mũ", "thắt lưng", "ví"], "phụ kiện"),
]

# ─────────────────────────────────────────────────────────────────
# Màu sắc đồng nghĩa - fuzzy matching
# ─────────────────────────────────────────────────────────────────
COLOR_ALIASES: list[tuple[list[str], str]] = [
    (["xanh navy", "navy"], "xanh navy"),
    (["xanh rêu", "rêu", "reu"], "xanh rêu"),
    (["xanh ngọc"], "xanh ngọc"),
    (["xanh bơ", "xanh mint", "mint", "bơ"], "xanh bơ"),
    (["xanh nhạt", "xanh lợt"], "xanh nhạt"),
    (["xanh đậm", "xanh đen"], "xanh đậm"),
    (["xanh khói"], "xanh khói"),
    (["xanh coban", "coban"], "xanh coban"),
    (["xanh", "xanh dương", "blue"], "xanh"),
    (["trắng kem"], "trắng kem"),
    (["trắng", "trang", "white"], "trắng"),
    (["đen khói"], "đen khói"),
    (["đen", "den", "black"], "đen"),
    (["nâu cà phê", "cafe", "cà phê"], "nâu cà phê"),
    (["nâu đất"], "nâu đất"),
    (["nâu be"], "nâu be"),
    (["nâu", "brown"], "nâu"),
    (["be sữa"], "be sữa"),
    (["kaki be", "kaki"], "kaki be"),
    (["be", "kem", "cream"], "be"),
    (["xám tiêu"], "xám tiêu"),
    (["xám chuột"], "xám chuột"),
    (["xám khói", "ghi", "xám", "grey", "gray", "xam"], "xám"),
    (["vàng nhạt"], "vàng nhạt"),
    (["vàng", "yellow", "vang"], "vàng"),
    (["hồng pastel"], "hồng pastel"),
    (["hồng", "hong", "pink"], "hồng"),
    (["cam đất"], "cam đất"),
    (["cam", "orange"], "cam"),
    (["đỏ", "red", "do"], "đỏ"),
    (["tím khoai môn", "tím pastel", "tím", "purple", "tim"], "tím"),
]


class ChatResult(str):
    reply: str
    image_url: str | None

    def __new__(cls, reply: str, image_url: str | None = None):
        instance = super().__new__(cls, reply)
        instance.reply = reply
        instance.image_url = image_url
        return instance

    def __iter__(self):
        return iter((self.reply, self.image_url))


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
        try:
            return litellm.completion(
                model=self._model_name,
                messages=messages,
                tools=TOOLS,
                timeout=25.0,
                num_retries=1,
            )
        except Exception as e:
            # Tự động chuyển sang model flash-lite nếu model chính bị giới hạn quota 429
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                fallback_model = "gemini/gemini-flash-lite-latest"
                if self._model_name != fallback_model:
                    print(f"[Quota Auto-Switch] Chuyển tạm sang {fallback_model} do {self._model_name} hết hạn mức")
                    return litellm.completion(
                        model=fallback_model,
                        messages=messages,
                        tools=TOOLS,
                        timeout=25.0,
                        num_retries=1,
                    )
            raise

    # ─────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────
    def _extract_product_name(self, text: str, text_no_accent: str = None) -> str | None:
        if text_no_accent is None:
            text_no_accent = remove_diacritics(text)
        for aliases, canonical in PRODUCT_ALIASES:
            if _match_keywords(text, text_no_accent, aliases):
                return canonical
        return None

    def _extract_color(self, text: str, text_no_accent: str = None) -> str | None:
        if text_no_accent is None:
            text_no_accent = remove_diacritics(text)
        for aliases, canonical in COLOR_ALIASES:
            if _match_keywords(text, text_no_accent, aliases):
                return canonical
        return None

    def _extract_size(self, text: str) -> str | None:
        for s in ["xxl", "2xl", "xl", "freesize", "fs",
                   "29", "30", "31", "32", "33", "34",
                   "38", "39", "40", "41", "s", "m", "l"]:
            if re.search(rf'\b{s}\b', text):
                return s.upper()
        return None

    def _extract_code(self, text: str) -> str | None:
        match = re.search(r'\b([a-zA-Z]{1,3}\d{1,3})\b', text)
        return match.group(1).upper() if match else None

    def _extract_height_weight(self, text: str) -> tuple[int | None, int | None]:
        height_cm = None
        weight_kg = None

        # Chiều cao: 1m62, 1.62, 162cm, 162
        h_match = re.search(r'(?:cao\s*)?(\d)[m,.]\s*(\d{1,2})', text)
        if h_match:
            meters = int(h_match.group(1))
            cm_part = h_match.group(2).ljust(2, '0')[:2]
            height_cm = meters * 100 + int(cm_part)
        else:
            h_match2 = re.search(r'(?:cao\s*)?(\d{3})\s*(?:cm)?', text)
            if h_match2:
                val = int(h_match2.group(1))
                if 140 <= val <= 200:
                    height_cm = val

        # Cân nặng: 55kg, 55 ký, nặng 55
        w_match = re.search(r'(?:nặng\s*)?(\d{2,3})\s*(?:kg|kí|ký|cân)?', text)
        if w_match:
            val = int(w_match.group(1))
            if 30 <= val <= 150:
                weight_kg = val

        return height_cm, weight_kg

    def _suggest_size(self, height_cm: int | None, weight_kg: int | None) -> str:
        h = height_cm or 165
        w = weight_kg or 55

        if h <= 158 and w <= 48:
            return "S"
        elif h <= 165 and w <= 58:
            return "M"
        elif h <= 170 and w <= 68:
            return "L"
        elif h <= 175 and w <= 78:
            return "XL"
        else:
            return "XXL"

    def _format_price(self, price: int | float) -> str:
        return f"{int(price):,}đ".replace(",", ".")

    def _format_product_result(self, item: dict) -> str:
        name = item.get("name", "Sản phẩm")
        code = item.get("code", "")
        color = item.get("color", "")
        size = item.get("size", "")
        price = item.get("price", 0)
        stock = item.get("stock", 0)

        desc = f"{name}"
        if code:
            desc = f"**{name} ({code})**"
        if color:
            desc += f" màu {color}"
        if size:
            desc += f" size {size}"

        price_str = self._format_price(price) if price else ""

        if stock > 10:
            return (f"Dạ {desc} vẫn còn hàng ạ"
                    f"{f', giá {price_str}' if price_str else ''}. "
                    "Bạn muốn đặt luôn không ạ?")
        elif stock > 0:
            return (f"Dạ {desc} đang hết rất nhanh rồi ạ"
                    f"{f', giá {price_str}' if price_str else ''}. "
                    "Bạn nhanh tay đặt trước kẻo hết nha!")
        else:
            return (f"Dạ tiếc quá, {desc} hiện tạm hết hàng rồi ạ. "
                    "Shop xin lỗi bạn nhé! Bạn muốn xem màu hoặc size khác không ạ?")

    # ─────────────────────────────────────────────────────────────
    # Rule-based fallback (khi LLM không hoạt động)
    # ─────────────────────────────────────────────────────────────
    def _rule_based_fallback(self, user_id: str, user_message: str, image_path: str = None) -> str:
        # ── 1. Xử lý ảnh ──
        if image_path:
            try:
                res = self._tools.search_by_image(image_path=image_path)
                if res.get("found") and res.get("results"):
                    item = res["results"][0]
                    return self._format_product_result(item)
            except Exception as ex:
                print(f"Image search exception: {ex}")
            return ("Dạ em đã nhận được hình ảnh sản phẩm của bạn! "
                    "Em đang tìm các mẫu tương tự trong kho cho bạn đây ạ 💕")

        text = user_message.lower().strip()
        text_no_accent = remove_diacritics(text)

        # ── 2. Kiểm tra FAQ trước (chào hỏi, chính sách...) ──
        for keywords, response in FAQ_PATTERNS:
            if _match_keywords(text, text_no_accent, keywords):
                return response

        # ── 3. Tư vấn size (phát hiện chiều cao/cân nặng) ──
        height_cm, weight_kg = self._extract_height_weight(text)
        if height_cm or weight_kg:
            size = self._suggest_size(height_cm, weight_kg)
            h = height_cm or 165
            w = weight_kg or 55

            parts = []
            if height_cm:
                parts.append(f"chiều cao {h/100:.2f}m")
            if weight_kg:
                parts.append(f"cân nặng {w}kg")
            info_str = " và ".join(parts)

            return (f"Dạ với {info_str}, bạn mặc **size {size}** sẽ vừa đẹp nhất ạ! "
                    "Thích mặc rộng thoải mái hơn thì tăng lên một size nha 💕")

        # Hỏi tư vấn size nhưng chưa cho thông tin
        if _match_keywords(text, text_no_accent, ["tư vấn size", "chọn size", "size nào", "size gì",
                                                    "mặc size", "tu van size", "chon size"]):
            return "Bạn cho mình biết chiều cao và cân nặng để mình tư vấn size chuẩn nhất nha!"

        # ── 4. Tìm sản phẩm (mã + tên + màu + size) ──
        code = self._extract_code(text)
        name = self._extract_product_name(text, text_no_accent)
        color = self._extract_color(text, text_no_accent)
        size_req = self._extract_size(text)

        if code or name:
            try:
                res = self._tools.search_by_text(code=code, name=name, color=color, size=size_req)
                if res.get("found") and res.get("results"):
                    items = res["results"]
                    if len(items) == 1:
                        return self._format_product_result(items[0])
                    else:
                        # Nhiều kết quả → liệt kê tối đa 3
                        lines = ["Dạ bên mình có các mẫu sau ạ:"]
                        for i, item in enumerate(items[:3]):
                            n = item.get("name", "")
                            c = item.get("color", "")
                            s = item.get("size", "")
                            p = item.get("price", 0)
                            st = item.get("stock", 0)
                            status = "✅ Còn hàng" if st > 0 else "❌ Hết hàng"
                            price_str = self._format_price(p) if p else ""
                            line = f"• {n}"
                            if c:
                                line += f" màu {c}"
                            if s:
                                line += f" size {s}"
                            if price_str:
                                line += f" – {price_str}"
                            line += f" ({status})"
                            lines.append(line)
                        if len(items) > 3:
                            lines.append(f"...và {len(items) - 3} mẫu nữa.")
                        lines.append("Bạn muốn xem chi tiết mẫu nào ạ?")
                        return "\n".join(lines)
                elif code:
                    return (f"Dạ mã sản phẩm **{code}** hiện shop đang cập nhật hoặc tạm hết hàng. "
                            "Bạn có thể cho mình biết bạn tìm kiểu gì để mình gợi ý mẫu khác nhé!")
            except Exception as ex:
                print(f"Search exception: {ex}")

        # ── 5. Hỏi giá ──
        if _match_keywords(text, text_no_accent, ["bao nhiêu", "giá", "bao nhiu", "gia", "mắc không",
                                                    "đắt không", "rẻ không", "price"]):
            return ("Dạ bạn muốn hỏi giá sản phẩm nào ạ? Cho mình biết tên hoặc mã sản phẩm "
                    "(ví dụ: A02, Q01, SM01...) để mình báo giá chính xác nhé!")

        # ── 6. Đặt hàng ──
        if _match_keywords(text, text_no_accent, ["đặt", "mua", "lấy cái", "chốt", "order", "đặt hàng",
                                                    "mua hàng", "lấy", "book"]):
            phone_match = re.search(r'0\d{9,10}', text)
            if not phone_match:
                return ("Dạ bạn muốn đặt hàng đúng không ạ? "
                        "Bạn cho mình xin họ tên, SĐT và địa chỉ nhận hàng để mình lên đơn ngay nhé!")
            else:
                return ("Dạ mình đã ghi nhận thông tin đặt hàng rồi ạ! "
                        "Nhân viên sẽ liên hệ bạn sớm nhất để xác nhận đơn. Cảm ơn bạn đã tin tưởng Shop! 💕")

        # ── 7. Gợi ý sản phẩm (khách chưa biết muốn gì) ──
        if _match_keywords(text, text_no_accent, ["có gì", "gợi ý", "mới", "hot", "bán gì", "sản phẩm",
                                                    "xem hàng", "show", "menu", "danh mục", "catalogue"]):
            return ("Dạ bên mình đang có nhiều mẫu hot lắm ạ! ✨\n"
                    "• **Áo thun basic A02** – 150.000đ\n"
                    "• **Áo Polo A03** – phong cách classic\n"
                    "• **Áo Thun Graphic A04** – streetwear cá tính\n"
                    "• **Sơ mi Oxford SM01** – lịch lãm chống nhăn\n"
                    "• **Jean ống suông Q01** – 320.000đ\n"
                    "• **Jean Slimfit Q02** – tôn dáng\n"
                    "• **Khoác Bomber AK01** – chống nước 2 lớp\n"
                    "• **Quần Tây Hàn Quốc QT01** – xếp ly thanh lịch\n"
                    "Bạn thích style nào để mình tư vấn chi tiết hơn ạ?")

        # ── 8. Default – chào + gợi ý ──
        return ("Dạ em chào bạn ạ! Em là Trợ Lý AI của Fashion Shop ✨ "
                "Em có thể hỗ trợ bạn:\n"
                "• Tư vấn size theo chiều cao/cân nặng\n"
                "• Kiểm tra tồn kho & giá sản phẩm\n"
                "• Gợi ý phối đồ\n"
                "• Hỗ trợ đặt hàng\n"
                "Bạn cần em giúp gì ạ?")

    # ─────────────────────────────────────────────────────────────
    # Main chat entry
    # ─────────────────────────────────────────────────────────────
    def chat(self, user_id: str, user_message: str, image_path: str = None) -> ChatResult:
        self._memory.append(user_id, "user", user_message)

        answer = ""
        found_image_url: str | None = None
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
                        if isinstance(tool_result, dict) and tool_result.get("found") and tool_result.get("results"):
                            for item in tool_result["results"]:
                                if item.get("image_url") and not found_image_url:
                                    found_image_url = item["image_url"]
                                    break

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(tool_result, ensure_ascii=False),
                        })

                    response = self._call_llm(messages)

                answer = response.choices[0].message.content or ""
            except Exception as e:
                print(f"[LLM Exception] {e}")
                answer = self._rule_based_fallback(user_id, user_message, image_path=image_path)
        else:
            answer = self._rule_based_fallback(user_id, user_message, image_path=image_path)

        self._memory.append(user_id, "assistant", answer)
        return ChatResult(answer, found_image_url or self._last_fallback_image)
