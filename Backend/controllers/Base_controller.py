import chromadb

from helpers.config import get_settings
from helpers.logger import get_logger


class BaseController:
    _chroma_client = None

    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger(self.__class__.__name__)

    def get_chroma_client(self):
        if BaseController._chroma_client is not None:
            return BaseController._chroma_client

        if self.settings.CHROMA_HOST:
            self.logger.info(
                f"Connecting to Chroma server at "
                f"{self.settings.CHROMA_HOST}:{self.settings.CHROMA_PORT}"
            )
            client = chromadb.HttpClient(
                host=self.settings.CHROMA_HOST,
                port=self.settings.CHROMA_PORT,
            )
        else:
            self.settings.INDEX_DIR.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"Using local Chroma at {self.settings.INDEX_DIR}")
            client = chromadb.PersistentClient(path=str(self.settings.INDEX_DIR))

        BaseController._chroma_client = client
        return client

    def get_collection(self):
        client = self.get_chroma_client()
        try:
            return client.get_collection(self.settings.COLLECTION_NAME)
        except Exception as e:
            self.logger.error(
                f"Collection '{self.settings.COLLECTION_NAME}' not available: {e}"
            )
            raise