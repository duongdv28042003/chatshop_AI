"""
Test chat flow với LLM.
Usage:
    python scripts/test_chat.py                             # Chat bình thường, không ảnh              
    python scripts/test_chat.py --image path/to/img.jpg     # Chat với ảnh đính kèm 
"""

import argparse
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.llm import LLMService

USER_ID = "default"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, default=None, help="Đường dẫn ảnh đính kèm")
    args = parser.parse_args()

    llm = LLMService()
    print(f"Chat với Fashion Shop (user_id={USER_ID}). Gõ 'exit' để thoát.\n")

    while True:
        try:
            user_input = input("Bạn: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nTạm biệt!")
            break

        if not user_input:
            continue
        if user_input.lower() == "exit":
            print("Tạm biệt!")
            break

        answer = llm.chat(USER_ID, user_input, image_path=args.image)
        print(f"Shop: {answer}\n")

        # Chỉ dùng ảnh cho lượt đầu tiên nếu được truyền vào
        args.image = None

if __name__ == "__main__":
    main()
