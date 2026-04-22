"""
Session Manager – HUMANITY-PROTOCOL
=====================================
Thread-safe in-memory session store with TTL expiry.
Manages protocol state for each authentication attempt.
"""

import secrets
import threading
import time
import logging

log = logging.getLogger("HP-Sessions")

SESSION_TTL    = 300   # 5 minutes
TOKEN_TTL      = 3600  # 1 hour


class SessionManager:

    def __init__(self):
        self._sessions: dict = {}
        self._tokens:   dict = {}
        self._lock = threading.RLock()
        self._start_cleanup()

    # ── CRUD ──────────────────────────────────────────────────────────────
    def create_pending(self, user_id: str, device_fp: str, pub_key: str) -> str:
        sid = secrets.token_urlsafe(32)
        with self._lock:
            self._sessions[sid] = {
                "session_id":    sid,
                "user_id":       user_id,
                "device_fp":     device_fp,
                "public_key_pem": pub_key,
                "step":          1,
                "created_ts":    time.time(),
                "status":        "pending"
            }
        return sid

    def get(self, sid: str) -> dict | None:
        with self._lock:
            sess = self._sessions.get(sid)
            if sess is None:
                return None
            if time.time() - sess['created_ts'] > SESSION_TTL:
                del self._sessions[sid]
                return None
            return dict(sess)

    def update(self, sid: str, data: dict):
        with self._lock:
            if sid in self._sessions:
                self._sessions[sid].update(data)

    def fail(self, sid: str):
        with self._lock:
            if sid in self._sessions:
                self._sessions[sid]['status'] = 'failed'

    def issue_token(self, sid: str) -> str:
        with self._lock:
            sess = self._sessions.get(sid)
            if not sess:
                raise ValueError("Session not found")
            token = secrets.token_urlsafe(64)
            self._tokens[token] = {
                "user_id":    sess['user_id'],
                "session_id": sid,
                "issued_ts":  time.time()
            }
            self._sessions[sid]['status'] = 'authenticated'
            return token

    def validate_token(self, token: str) -> bool:
        with self._lock:
            t = self._tokens.get(token)
            if not t:
                return False
            if time.time() - t['issued_ts'] > TOKEN_TTL:
                del self._tokens[token]
                return False
            return True

    def count_active(self) -> int:
        with self._lock:
            now = time.time()
            return sum(
                1 for s in self._sessions.values()
                if now - s['created_ts'] <= SESSION_TTL and s['status'] not in ('failed', 'authenticated')
            )

    # ── Background cleanup ─────────────────────────────────────────────
    def _cleanup(self):
        while True:
            time.sleep(60)
            now = time.time()
            with self._lock:
                expired_s = [k for k, v in self._sessions.items()
                             if now - v['created_ts'] > SESSION_TTL]
                for k in expired_s:
                    del self._sessions[k]

                expired_t = [k for k, v in self._tokens.items()
                             if now - v['issued_ts'] > TOKEN_TTL]
                for k in expired_t:
                    del self._tokens[k]
            if expired_s or expired_t:
                log.info(f"Cleanup: removed {len(expired_s)} sessions, {len(expired_t)} tokens")

    def _start_cleanup(self):
        t = threading.Thread(target=self._cleanup, daemon=True)
        t.start()
