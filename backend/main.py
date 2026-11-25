from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from core.config import settings, log
from services.http_client import get_http_client, close_http_client

from api.rest import router as rest_router
from api.ws import router as ws_router
from api.resume.resume import router as resume_router
from api.job_roadmap import router as job_roadmap_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"HireIQ starting — LLM: {settings.LLM_BACKEND}, TTS: {settings.TTS_BACKEND}")
    await get_http_client()
    yield
    await close_http_client()
    log.info("HireIQ shut down cleanly")


app = FastAPI(title="HireIQ API", version="2.0.0", lifespan=lifespan, default_response_class=ORJSONResponse)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return ORJSONResponse(status_code=500, content={"detail": "Internal server error."})


app.include_router(rest_router)
app.include_router(ws_router)
app.include_router(resume_router, prefix="/api", tags=["resume"])
app.include_router(job_roadmap_router)
