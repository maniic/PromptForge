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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import forge, health
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

app.include_router(health.router)
app.include_router(forge.router)
