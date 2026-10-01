from dataclasses import dataclass

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.logging_config import get_logger
from app.models import User

logger = get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None
_auth_http: httpx.Client | None = None
_logged_jwks_ok = False


def _get_jwks_client(settings: Settings) -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        # Short timeout so a JWKS miss falls through quickly instead of
        # blocking every request for the client default (30s).
        logger.info("auth JWKS client created url=%s", settings.jwks_url)
        _jwks_client = PyJWKClient(
            settings.jwks_url,
            cache_keys=True,
            timeout=5,
        )
    return _jwks_client


def _get_auth_http() -> httpx.Client:
    """Shared client for the Auth /user fallback. Not used on the hot path."""
    global _auth_http
    if _auth_http is None:
        logger.info("auth Auth /user client created (fallback only)")
        _auth_http = httpx.Client(timeout=10.0)
    return _auth_http


@dataclass
class TokenClaims:
    sub: str
    email: str | None = None
    name: str | None = None


def decode_supabase_token(token: str, settings: Settings) -> TokenClaims:
    """Verify a Supabase access token without a network call when possible.

    Order: cached JWKS, then legacy HS256 secret, then Auth /user.
    Auth /user is a fallback only — calling it on every request made the
    dashboard wait on Supabase before any query ran.
    """
    last_error: Exception | None = None

    try:
        claims = _verify_via_jwks(token, settings)
        return claims
    except Exception as exc:  # noqa: BLE001
        last_error = exc
        logger.debug("auth JWKS not used: %s", exc)

    if settings.supabase_jwt_secret:
        try:
            claims = _verify_via_jwt_secret(token, settings)
            logger.debug("auth ok via JWT secret sub=%s", claims.sub)
            return claims
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.debug("auth JWT secret not used: %s", exc)

    if settings.supabase_anon_key:
        logger.info("auth local verify missed; falling back to Auth /user")
        try:
            claims = _verify_via_auth_api(token, settings)
            logger.info("auth ok via Auth /user sub=%s", claims.sub)
            return claims
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("auth Auth /user failed: %s", exc)

    logger.error("auth failed all methods last_error=%s", last_error)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_format_auth_error(last_error, settings),
        headers={"WWW-Authenticate": "Bearer"},
    )


def _verify_via_jwks(token: str, settings: Settings) -> TokenClaims:
    global _logged_jwks_ok
    client = _get_jwks_client(settings)
    signing_key = client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256", "HS256"],
        audience="authenticated",
        options={"require": ["sub", "exp"]},
    )
    claims = _claims_from_payload(payload)
    if not _logged_jwks_ok:
        logger.info("auth using JWKS (local verify; keys cached after first fetch)")
        _logged_jwks_ok = True
    logger.debug("auth ok via JWKS sub=%s", claims.sub)
    return claims


def _verify_via_jwt_secret(token: str, settings: Settings) -> TokenClaims:
    secret = settings.supabase_jwt_secret
    if not secret:
        raise RuntimeError("SUPABASE_JWT_SECRET is not set")
    payload = jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
        options={"require": ["sub", "exp"]},
    )
    return _claims_from_payload(payload)


def _verify_via_auth_api(token: str, settings: Settings) -> TokenClaims:
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key or "",
    }
    try:
        res = _get_auth_http().get(settings.auth_user_url, headers=headers)
    except httpx.ConnectError as exc:
        logger.error(
            "auth cannot reach Supabase url=%s error=%s", settings.supabase_url, exc
        )
        raise RuntimeError(
            f"Cannot reach Supabase at {settings.supabase_url} "
            f"(DNS/network). Check SUPABASE_URL in apps/api/.env. ({exc})"
        ) from exc

    if res.status_code == 401:
        raise RuntimeError("Supabase rejected the access token (expired or invalid)")
    if res.status_code >= 400:
        raise RuntimeError(f"Supabase Auth /user returned {res.status_code}: {res.text}")

    data = res.json()
    sub = data.get("id")
    if not sub:
        raise RuntimeError("Supabase /user response missing id")
    meta = data.get("user_metadata") or {}
    name = meta.get("full_name") or meta.get("name")
    return TokenClaims(sub=str(sub), email=data.get("email"), name=name)


def _format_auth_error(last_error: Exception | None, settings: Settings) -> str:
    base = f"Invalid or expired token: {last_error}"
    if last_error and "getaddrinfo" in str(last_error):
        return (
            f"{base}. SUPABASE_URL host could not be resolved: "
            f"{settings.supabase_url}. Open Supabase → Project Settings → API "
            "and copy the exact Project URL into apps/api/.env and apps/web/.env.local."
        )
    if not settings.supabase_anon_key:
        return (
            f"{base}. Also set SUPABASE_ANON_KEY in apps/api/.env "
            "(same publishable/anon key as the web app)."
        )
    return base


def _claims_from_payload(payload: dict) -> TokenClaims:
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )
    meta = payload.get("user_metadata") or {}
    name = meta.get("full_name") or meta.get("name") or payload.get("name")
    return TokenClaims(
        sub=str(sub),
        email=payload.get("email"),
        name=name,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    if credentials is None or not credentials.credentials:
        logger.warning("auth missing bearer token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = decode_supabase_token(credentials.credentials, settings)

    user = (
        db.query(User)
        .filter(User.auth_provider_id == claims.sub)
        .one_or_none()
    )
    if user is None:
        user = User(
            auth_provider_id=claims.sub,
            email=claims.email,
            name=claims.name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("user created id=%s auth_sub=%s", user.id, claims.sub)
    else:
        changed = False
        if claims.email and user.email != claims.email:
            user.email = claims.email
            changed = True
        if claims.name and user.name != claims.name:
            user.name = claims.name
            changed = True
        if changed:
            db.commit()
            db.refresh(user)
            logger.debug("user updated id=%s", user.id)
        else:
            logger.debug("user ok id=%s", user.id)

    return user
