"""
logger.py — Structured Logging System
"""

import logging
import os
from datetime import datetime

# ─── Log folder ────────────────────────────────────────────
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, f"crowd_{datetime.now().strftime('%Y%m%d')}.log")

# ─── Formatter ─────────────────────────────────────────────
formatter = logging.Formatter(
    fmt="[%(asctime)s] %(levelname)s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# ─── File Handler ──────────────────────────────────────────
file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)

# ─── Console Handler ───────────────────────────────────────
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

# ─── Root Logger ───────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,
    handlers=[file_handler, console_handler]
)

def get_logger(name: str) -> logging.Logger:
    """
    Use this in every file:
      from logger import get_logger
      log = get_logger(__name__)
      log.info("Something happened")
      log.warning("Watch out")
      log.error("Something broke")
    """
    return logging.getLogger(name)


# ─── Test ──────────────────────────────────────────────────
if __name__ == "__main__":
    log = get_logger("test")
    log.info("Logger working correctly")
    log.warning("This is a warning")
    log.error("This is an error")
    print(f"\nLog file saved at: {LOG_FILE}")