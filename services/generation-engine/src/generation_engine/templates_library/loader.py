from pathlib import Path
from typing import Any

import yaml

TEMPLATES_DIR = Path(__file__).parent / "data"


def load_template_files() -> list[dict[str, Any]]:
    return [yaml.safe_load(f.read_text()) for f in sorted(TEMPLATES_DIR.glob("*.yaml"))]
