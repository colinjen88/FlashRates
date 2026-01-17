import time
import logging
from backend.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class CircuitBreaker:
    def __init__(self, failure_threshold: int = settings.FAILURE_THRESHOLD, recovery_timeout: int = settings.RECOVERY_TIMEOUT):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = {} # source_name -> count
        self.last_failure_time = {} # source_name -> timestamp
        self.open_circuits = set() # Set of source_names

    def record_failure(self, source_name: str):
        self.failures[source_name] = self.failures.get(source_name, 0) + 1
        self.last_failure_time[source_name] = time.time()
        
        if self.failures[source_name] >= self.failure_threshold:
            logger.warning(f"Circuit Breaker: OPEN for {source_name}")
            self.open_circuits.add(source_name)

    def record_success(self, source_name: str):
        if source_name in self.failures:
            self.failures[source_name] = max(0, self.failures[source_name] - 1)
        
        if source_name in self.open_circuits and self.failures[source_name] == 0:
            logger.info(f"Circuit Breaker: CLOSED for {source_name}")
            self.open_circuits.remove(source_name)

    def is_available(self, source_name: str) -> bool:
        if source_name not in self.open_circuits:
            return True
        
        # Check if recovery timeout has passed
        if time.time() - self.last_failure_time.get(source_name, 0) > self.recovery_timeout:
            # Half-open state: allow a retry
            # We don't remove from open_circuits yet, but return True to allow one check.
            # If logic requires explicit Half-Open state, can be added. 
            # For simplicity: Reset failure count effectively closing it on next success or reopening on fail.
            logger.info(f"Circuit Breaker: HALF-OPEN for {source_name}")
            self.failures[source_name] = self.failure_threshold - 1 # Give it one chance
            self.open_circuits.remove(source_name) 
            return True
            
        return False
