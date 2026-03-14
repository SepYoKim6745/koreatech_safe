import time
from collections import defaultdict
from threading import Lock


class LoginRateLimiter:
    """로그인 시도 횟수를 제한하는 인메모리 Rate Limiter"""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_rate_limited(self, key: str) -> bool:
        """주어진 key(IP 또는 이메일)가 rate limit에 걸렸는지 확인하고 시도를 기록"""
        now = time.time()
        with self._lock:
            # 만료된 기록 제거
            self._attempts[key] = [
                t for t in self._attempts[key]
                if now - t < self.window_seconds
            ]
            if len(self._attempts[key]) >= self.max_attempts:
                return True
            self._attempts[key].append(now)
            return False

    def remaining_seconds(self, key: str) -> int:
        """rate limit 해제까지 남은 시간(초) 반환"""
        now = time.time()
        with self._lock:
            attempts = [
                t for t in self._attempts[key]
                if now - t < self.window_seconds
            ]
            if len(attempts) >= self.max_attempts and attempts:
                oldest = min(attempts)
                return max(0, int(self.window_seconds - (now - oldest)))
        return 0

    def reset(self, key: str):
        """로그인 성공 시 해당 key의 기록 초기화"""
        with self._lock:
            self._attempts.pop(key, None)
