import time
import logging
from backend.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class CircuitBreaker:
    def __init__(self, failure_threshold: int = settings.FAILURE_THRESHOLD, recovery_timeout: int = settings.RECOVERY_TIMEOUT):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = {}           # source_name -> count
        self.last_failure_time = {}  # source_name -> timestamp
        self.open_circuits = set()   # OPEN state
        self._half_open = set()      # HALF-OPEN state (only one probe at a time)

    def record_failure(self, source_name: str):
        self.failures[source_name] = self.failures.get(source_name, 0) + 1
        self.last_failure_time[source_name] = time.time()
        # Return to OPEN if half-open probe failed
        self._half_open.discard(source_name)
        if self.failures[source_name] >= self.failure_threshold:
            if source_name not in self.open_circuits:
                logger.warning(f"Circuit Breaker: OPEN for {source_name}")
            self.open_circuits.add(source_name)

    def record_success(self, source_name: str):
        if source_name in self.failures:
            self.failures[source_name] = max(0, self.failures[source_name] - 1)
        self._half_open.discard(source_name)
        if source_name in self.open_circuits and self.failures[source_name] == 0:
            logger.info(f"Circuit Breaker: CLOSED for {source_name}")
            self.open_circuits.discard(source_name)

    def is_available(self, source_name: str) -> bool:
        if source_name not in self.open_circuits:
            return True

        # Check if recovery timeout has passed
        if time.time() - self.last_failure_time.get(source_name, 0) > self.recovery_timeout:
            # Only allow ONE probe at a time (prevent half-open flood)
            if source_name not in self._half_open:
                logger.info(f"Circuit Breaker: HALF-OPEN for {source_name}")
                self._half_open.add(source_name)
                self.failures[source_name] = self.failure_threshold - 1
                self.open_circuits.discard(source_name)
                return True

        return False
