from typing import List

from fastapi import APIRouter

from controllers.internal_controller import InternalController
from schemas.internal import ConfigSnapshotResponse, DocumentInfo, StatsResponse
from schemas.benchmark import BenchmarkResponse

internal_router = APIRouter(prefix="/internal", tags=["Internal - Developers Only"])


@internal_router.get("/stats", response_model=StatsResponse)
def get_stats():
    return InternalController().get_stats()


@internal_router.get("/documents", response_model=List[DocumentInfo])
def list_documents():
    return InternalController().list_documents()


@internal_router.get("/config", response_model=ConfigSnapshotResponse)
def get_config():
    return InternalController().get_config_snapshot()


@internal_router.get("/benchmark", response_model=BenchmarkResponse)
def get_benchmark(): 
    return InternalController().get_benchmark()