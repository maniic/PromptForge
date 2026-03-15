from pydantic_settings import BaseSettings
from pydantic import ConfigDict, model_validator
from functools import lru_cache


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    watsonx_api_key: str
    watsonx_project_id: str
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watsonx_model_id: str = "ibm/granite-3-8b-instruct"
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    next_public_api_url: str = "http://localhost:8000"
    environment: str = "development"
    max_tokens_craft: int = 2500
    max_tokens_execute: int = 3500
    log_level: str = "INFO"

    @model_validator(mode="after")
    def enforce_token_minimums(self) -> "Settings":
        """Ensure token limits are high enough for complete output.

        The .env may contain old low values (500/800) that cause truncation.
        Enforce minimums so crafted prompts and results are never cut off.
        """
        if self.max_tokens_craft < 2500:
            self.max_tokens_craft = 2500
        if self.max_tokens_execute < 3500:
            self.max_tokens_execute = 3500
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()