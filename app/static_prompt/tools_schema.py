TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_by_text",
            "description": "Tìm sản phẩm theo mã, tên, màu sắc hoặc size. Dùng khi user hỏi bằng text.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code":  {"type": "string", "description": "Mã sản phẩm, ví dụ: A02, Q01"},
                    "name":  {"type": "string", "description": "Tên hoặc từ khóa tên sản phẩm"},
                    "color": {"type": "string", "description": "Màu sắc, ví dụ: hong, den, trang"},
                    "size":  {"type": "string", "description": "Size: S, M, L, XL, XXL"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_by_image",
            "description": "Tìm sản phẩm giống nhất với ảnh user gửi. Dùng khi có ảnh đính kèm.",
            "parameters": {
                "type": "object",
                "properties": {
                    "image_path": {"type": "string", "description": "Đường dẫn file ảnh local"},
                },
                "required": ["image_path"],
            },
        },
    },
]
