"""KeyGate — LLM API Key Management Service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.config import get_settings
from app.core.exceptions import (
    DeveloperNotFoundError,
    KeyNotFoundError,
    VendorProvisioningError,
    not_found_handler,
    vendor_error_handler,
)
from app.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="KeyGate",
    description="Open-source LLM API key management for teams",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(VendorProvisioningError, vendor_error_handler)
app.add_exception_handler(KeyNotFoundError, not_found_handler)
app.add_exception_handler(DeveloperNotFoundError, not_found_handler)

# Routes
app.include_router(router)


@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "service": "keygate",
        "version": settings.app_version,
    }
