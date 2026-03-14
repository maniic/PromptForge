"""
PromptForge API — FastAPI application entry point.

Startup sequence (INFRA-05):
  1. Lifespan probes IBM Granite with a minimal generate_text call.
  2. If Granite responds, the server starts accepting requests.
  3. If Granite raises GraniteError (bad creds, network down, etc.),
     the server logs the failure and exits with code 1 — fail fast.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.routers import anatomy, forge, health, library
from backend.services import granite_service
from backend.services.granite_service import GraniteError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate IBM Granite credentials on startup; abort with exit(1) on failure."""
    logger.info("PromptForge startup: probing IBM Granite...")
    try:
        response = await granite_service.generate_text(
            prompt="Say hello.",
            call_name="startup_probe",
            max_tokens=5,
        )
        logger.info("IBM Granite verified in %.0fms", response.latency_ms)
    except GraniteError as exc:
        logger.error("IBM Granite startup validation failed: %s", exc)
        sys.exit(1)

    yield
    # No shutdown cleanup required for this phase


app = FastAPI(
    title="PromptForge API",
    description="Transforms rough ideas into expert prompts via IBM Granite.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for hackathon dev (frontend on different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handlers — never expose raw tracebacks
# ---------------------------------------------------------------------------


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return clean 422 with readable detail, never raw Pydantic internals."""
    errors = exc.errors()
    messages = [f"{e.get('loc', ['?'])[-1]}: {e.get('msg', 'invalid')}" for e in errors]
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all: log the real error, return a safe 500 message."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."},
    )


app.include_router(health.router)
app.include_router(forge.router)
app.include_router(library.router)
app.include_router(anatomy.router)
