from fastapi import APIRouter

from controllers.generation_controller import GenerationController
from schemas.generation import GenerateRequest, GenerateResponse

generate_router = APIRouter(tags=["Generation"])


@generate_router.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest):
    
    return GenerationController().answer(payload.query, top_k=payload.top_k)