"""
Authentication Logger – HUMANITY-PROTOCOL
==========================================
Structured in-memory log with disk persistence.
"""

import json
import threading
import logging
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger("HP-Logger")
LOG_FILE = Path(__file__).parent / "auth_events.log"


class AuthLogger:
    def __init__(self):
        self._events: list = []
        self._lock = threading.Lock()
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    def log_event(self, event_type: str, message: str, metadata: dict = None):
        entry = {
            "ts":    datetime.now(timezone.utc).isoformat(),
            "type":  event_type,
            "msg":   message,
            "meta":  metadata or {}
        }
        with self._lock:
            self._events.append(entry)
            # Keep last 500 events in memory
            if len(self._events) > 500:
                self._events.pop(0)
        # Also write to disk
        try:
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as exc:
            log.warning(f"Could not write log to disk: {exc}")
        log.info(f"[{event_type}] {message}")

    def recent(self, n: int = 50) -> list:
        with self._lock:
            return list(reversed(self._events[-n:]))
