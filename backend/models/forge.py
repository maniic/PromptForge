from pydantic import BaseModel, Field


class GraniteResponse(BaseModel):
    """Response from a single IBM Granite generate_text call."""

    text: str
    latency_ms: float

    def __repr__(self) -> str:
        return f"GraniteResponse(text={self.text!r}, latency_ms={self.latency_ms})"


class ForgeRequest(BaseModel):
    """Incoming request to the /api/forge endpoint."""

    input: str = Field(..., min_length=3, max_length=1000)


class CallTiming(BaseModel):
    """Timing record for a single Granite call within the forge pipeline."""

    call_name: str
    latency_ms: float


class ForgeResponse(BaseModel):
    """Full response returned by the /api/forge endpoint."""

    category: str           # "vibe_coding" | "brainstorming" | "qa"
    crafted_prompt: str
    crafted_result: str
    raw_result: str
    call_timings: list[CallTiming]
    total_latency_ms: float
