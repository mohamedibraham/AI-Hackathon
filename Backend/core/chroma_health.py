import time

from helpers.config import get_settings
from helpers.logger import get_logger
from core.build_vector_index import get_chroma_client

settings = get_settings()
logger = get_logger("chroma_health")


def wait_for_chroma(timeout: int = 30, interval: float = 2.0) -> bool:
    deadline = time.monotonic() + timeout
    attempt = 0
    last_error = None

    while time.monotonic() < deadline:
        attempt += 1
        try:
            client = get_chroma_client()
            client.heartbeat()
            logger.info(f"Chroma is reachable (attempt {attempt}).")
            return True
        except Exception as e:
            last_error = e
            logger.info(f"Chroma not ready yet (attempt {attempt}): {e}")
            time.sleep(interval)

    logger.error(
        f"Chroma still unreachable after {timeout}s ({attempt} attempts). "
        f"Last error: {last_error}. Check 'docker compose ps' and "
        f"'docker compose logs chroma'."
    )
    return False