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


def _get_jwks_client(settings: Settings) -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        logger.debug("Creating JWKS client url=%s", settings.jwks_url)
        _jwks_client = PyJWKClient(settings.jwks_url, cache_keys=True)
    return _jwks_client


@dataclass
class TokenClaims:
    sub: str
    email: str | None = None
    name: str | None = None


def decode_supabase_token(token: str, settings: Settings) -> TokenClaims:
    last_error: Exception | None = None

    if settings.supabase_anon_key:
        try:
            claims = _verify_via_auth_api(token, settings)
            logger.debug("auth ok via Auth /user sub=%s", claims.sub)
            return claims
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("auth Auth /user failed: %s", exc)

    try:
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
        logger.debug("auth ok via JWKS sub=%s", claims.sub)
        return claims
    except Exception as exc:  # noqa: BLE001
        last_error = exc
        logger.warning("auth JWKS failed: %s", exc)

    if settings.supabase_jwt_secret:
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["sub", "exp"]},
            )
            claims = _claims_from_payload(payload)
            logger.debug("auth ok via JWT secret sub=%s", claims.sub)
            return claims
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("auth JWT secret failed: %s", exc)

    logger.error("auth failed all methods last_error=%s", last_error)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_format_auth_error(last_error, settings),
        headers={"WWW-Authenticate": "Bearer"},
    )


def _verify_via_auth_api(token: str, settings: Settings) -> TokenClaims:
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key or "",
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(settings.auth_user_url, headers=headers)
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
