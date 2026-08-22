import re
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx

from .Base_controller import BaseController
from core.pipeline import ingest_single_document
from helpers.config import get_settings
from utils import response_signal


class DocumentsController(BaseController):

    def _is_trusted(self, url: str) -> bool:
        host = (urlparse(url).hostname or "").lower()
        return any(host == d or host.endswith("." + d) for d in self.settings.TRUSTED_DOMAINS)

    def _safe_filename(self, url: str, document_name: str | None) -> str:
        base = document_name or Path(urlparse(url).path).stem or "document"
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", base).strip("-").lower()[:60]
        return f"{slug or 'document'}-{uuid.uuid4().hex[:8]}.pdf"

    def upload_from_url(self, url, document_name: str | None) -> dict:
        url = str(url)

        if not self._is_trusted(url):
            self.logger.warning(f"Rejected untrusted source URL: {url}")
            return {
                "status": "rejected",
                "document_name": document_name or "",
                "source_url": url,
                "chunks_indexed": 0,
                "detail": response_signal.FAILED_Source_reliability,
            }

        filename = self._safe_filename(url, document_name)
        dest = self.settings.RAW_PDF_DIR / filename
        self.settings.RAW_PDF_DIR.mkdir(parents=True, exist_ok=True)

        max_bytes = self.settings.MAX_PDF_SIZE_MB * 1024 * 1024

        try:
            with httpx.Client(follow_redirects=True, timeout=30) as client:
                head = client.head(url)
                content_length = int(head.headers.get("content-length", 0) or 0)
                if content_length and content_length > max_bytes:
                    return {
                        "status": "rejected",
                        "document_name": document_name or "",
                        "source_url": url,
                        "chunks_indexed": 0,
                        "detail": response_signal.FAILED_SIZE_EXCEEDED,
                    }

                with client.stream("GET", url) as resp:
                    resp.raise_for_status()
                    content_type = resp.headers.get("content-type", "").lower()
                    if "pdf" not in content_type and not url.lower().endswith(".pdf"):
                        return {
                            "status": "rejected",
                            "document_name": document_name or "",
                            "source_url": url,
                            "chunks_indexed": 0,
                            "detail": response_signal.FAILED_File_TYPE,
                        }

                    bytes_written = 0
                    try:
                        with open(dest, "wb") as f:
                            for chunk in resp.iter_bytes():
                                bytes_written += len(chunk)
                                if bytes_written > max_bytes:
                                    raise ValueError(
                                        f"Download exceeded {self.settings.MAX_PDF_SIZE_MB}MB limit"
                                    )
                                f.write(chunk)
                    except ValueError as e:
                        dest.unlink(missing_ok=True)
                        self.logger.warning(f"Aborted oversized download from {url}: {e}")
                        return {
                            "status": "rejected",
                            "document_name": document_name or "",
                            "source_url": url,
                            "chunks_indexed": 0,
                            "detail": response_signal.FAILED_SIZE_EXCEEDED,
                        }
        except httpx.HTTPError as e:
            self.logger.error(f"Failed to download {url}: {e}")
            return {
                "status": "error",
                "document_name": document_name or "",
                "source_url": url,
                "chunks_indexed": 0,
                "detail": str(e),
            }

        doc_name = document_name or filename.rsplit(".", 1)[0]

        try:
            result = ingest_single_document(
                document_name=doc_name, source_url=url, filename=filename,
            )
        except Exception as e:
            self.logger.error(f"Pipeline failed for {url}: {e}")
            return {
                "status": "error",
                "document_name": doc_name,
                "source_url": url,
                "chunks_indexed": 0,
                "detail": str(e),
            }

        return {
            "status": "indexed",
            "document_name": doc_name,
            "source_url": url,
            "chunks_indexed": result["chunks_indexed"],
            "detail": None,
        }