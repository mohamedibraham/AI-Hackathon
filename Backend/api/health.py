from fastapi import APIRouter

from controllers.internal_controller import InternalController
from schemas.internal import HealthResponse

health_router = APIRouter(tags=["Health"])


@health_router.get("/health", response_model=HealthResponse)
def health_check():
    return InternalController().check_health()
