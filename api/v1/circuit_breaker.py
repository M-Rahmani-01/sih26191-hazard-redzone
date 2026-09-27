"""
Simple circuit breaker — agar Gemini API baar-baar fail ho, thodi der ke liye
usko try karna hi band kar deta hai, taaki demo slow na ho.
"""

import time


class SimpleCircuitBreaker:
    def __init__(self, max_failures: int = 3, cooldown_seconds: int = 60):
        self.failures = 0
        self.max_failures = max_failures
        self.cooldown = cooldown_seconds
        self.last_failure_time = None

    def should_try(self) -> bool:
        if self.failures < self.max_failures:
            return True
        if self.last_failure_time and (time.time() - self.last_failure_time) > self.cooldown:
            self.failures = 0
            return True
        return False

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()

    def record_success(self):
        self.failures = 0


gemini_breaker = SimpleCircuitBreaker(max_failures=3, cooldown_seconds=60)