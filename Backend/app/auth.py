import os
import secrets

from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

# The key clients must send in the `X-API-Key` header.
#
# Reads from an env var so it's never hardcoded in source control. Falls back
# to a clearly-labelled dev default so the project still runs out of the box
# for local evaluation — but that fallback should always be overridden via
# SPEND_TRACKER_API_KEY before deploying anywhere public.
API_KEY = os.environ.get("SPEND_TRACKER_API_KEY", "dev-local-only-key")

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(provided: str = Security(_api_key_header)) -> str:
    """FastAPI dependency: raises 401 unless the request carries a valid
    X-API-Key header. Uses a constant-time comparison to avoid leaking
    timing information about the key."""
    if provided is None or not secrets.compare_digest(provided, API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key. Send it in the 'X-API-Key' header.",
        )
    return provided
