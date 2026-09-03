from pathlib import Path

from app.static_prompt.tools_schema import TOOLS

def load_system_prompt() -> str:
    path = Path(__file__).parent / "system_prompt.md"
    if not path.exists():
        raise FileNotFoundError(f"system_prompt.md not found at {path}")
    return path.read_text(encoding="utf-8").strip()

SYSTEM_PROMPT = load_system_prompt()

__all__ = ["SYSTEM_PROMPT", "TOOLS"]
