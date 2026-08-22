from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    upload_router,
    internal_router,
    generate_router,
    health_router,
    search_router,
)
from core.chroma_health import wait_for_chroma
from core.pipeline import run_full_pipeline
from helpers import get_settings
from helpers.logger import get_logger

settings = get_settings()
logger = get_logger("startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup: waiting for Chroma...")
    chroma_ready = wait_for_chroma(timeout=30, interval=2.0)

    if chroma_ready:
        logger.info("Startup: checking pipeline state...")
        try:
            result = run_full_pipeline()
            logger.info(f"Startup pipeline result: {result}")
        except Exception as e:
            logger.error(f"Startup pipeline failed: {e}")
    else:
        
        logger.error("Skipping startup pipeline -- Chroma unreachable.")

    yield
    


app = FastAPI(
    title="AI Hackathon RAG",
    lifespan=lifespan,
    version=settings.app_version,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",   
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",

        "http://localhost:8080",   
        "http://127.0.0.1:8080",
        "http://localhost:3000",   
    
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(health_router)
app.include_router(internal_router)
app.include_router(upload_router)
app.include_router(generate_router)