from pydantic import BaseModel


class GraniteResponse(BaseModel):
    """Response from a single IBM Granite generate_text call."""

    text: str
    latency_ms: float

    def __repr__(self) -> str:
        return f"GraniteResponse(text={self.text!r}, latency_ms={self.latency_ms})"
