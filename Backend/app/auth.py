"""Google-only authentication.

Flow:
  1. Frontend gets a Google ID token (the "credential") via Google Sign-In.
  2. POST /auth/google {credential} -> we verify it with Google, upsert the
     user, and return our own short-lived JWT.
  3. Every other endpoint requires `Authorization: Bearer <our JWT>`.
"""
import logging
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from . import models
from .database import get_db

log = logging.getLogger("uvicorn.error")

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))  # 7 days

if not GOOGLE_CLIENT_ID:
    raise ValueError("GOOGLE_CLIENT_ID environment variable is not set.")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise ValueError("JWT_SECRET must be set to a random string of at least 32 characters.")

_bearer = HTTPBearer(auto_error=False)


def verify_google_credential(credential: str) -> dict:
    """Validates a Google ID token (signature, audience, expiry) and returns its claims."""
    try:
        claims = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        # Logged server-side only, so you can see WHY Google's token was rejected
        # (wrong audience / client id, expired, clock skew, ...).
        log.warning("Google token rejected: %s", e)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential.")
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential.")
    if not claims.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google email is not verified.")
    return claims


def upsert_user(db: Session, claims: dict) -> models.User:
    user = db.query(models.User).filter(models.User.google_sub == claims["sub"]).first()
    now = datetime.now(timezone.utc)
    if user is None:
        user = models.User(google_sub=claims["sub"], email=claims["email"])
        db.add(user)
    user.email = claims["email"]
    user.name = claims.get("name")
    user.picture = claims.get("picture")
    user.last_login_at = now
    db.commit()
    db.refresh(user)
    return user


def create_access_token(user: models.User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.User:
    """Dependency: resolves the logged-in user or raises 401."""
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not authenticated. Please sign in with Google.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    user = db.get(models.User, user_id)
    if user is None:
        raise unauthorized
    return user