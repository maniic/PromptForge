"""
Supabase client singleton for PromptForge.

Architecture rules (CLAUDE.md):
  - All secrets from config.py settings — never os.getenv() directly
  - Community library ops via library_service.py only (callers must not import this directly)

Provides a lazy-initialized synchronous Supabase client.
The singleton is reset to None only during testing via monkeypatching.
"""
from supabase import create_client, Client

from backend.config import settings

_client: Client | None = None


def supabase_client() -> Client:
    """Return (or create) the shared Supabase client singleton.

    Uses service key so server-side operations bypass row-level security
    where needed.
    """
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client
