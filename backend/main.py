from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Core imports
from core.config import settings, log
from services.http_client import get_http_client, close_http_client

# Route imports
from api.rest import router as rest_router
from api.ws import router as ws_router
from api.resume.resume import router as resume_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"HireIQ starting — LLM: {settings.LLM_BACKEND}, TTS: {settings.TTS_BACKEND}")
    
    # Initialize shared resources (connection pool)
    await get_http_client()
    
    # Cachetools manages TTL automatically upon insertion and access,
    # so we don't need a background cleanup loop anymore.
    
    yield

    # Clean up resources on shutdown
    await close_http_client()
    log.info("HireIQ shut down cleanly")


app = FastAPI(title="HireIQ API", version="2.0.0", lifespan=lifespan)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include separated logic routers
app.include_router(rest_router)
app.include_router(ws_router)
app.include_router(resume_router, prefix="/api", tags=["resume"])
