from datetime import timedelta, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.rate_limiter import LoginRateLimiter
from app.models.user import User
from app.schemas import Token, UserCreate, UserResponse
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 로그인 Rate Limiter 인스턴스
_login_limiter = LoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS
)

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        username=user.username or user.email.split("@")[0],
        is_admin=False  # 관리자 권한은 절대 클라이언트에서 설정 불가
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    client_ip = request.client.host

    # Rate Limiting 체크 (IP 기반)
    if _login_limiter.is_rate_limited(client_ip):
        remaining = _login_limiter.remaining_seconds(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please try again in {remaining} seconds."
        )

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 비활성화된 계정 차단
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact administrator."
        )

    # 로그인 성공 — rate limit 카운터 초기화
    _login_limiter.reset(client_ip)

    # 로그인 정보 업데이트
    user.last_login = datetime.now(timezone.utc)
    user.last_ip = client_ip
    user.user_agent = request.headers.get("user-agent")
    db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "success": True}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

@router.delete("/me")
async def delete_user_me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """현재 로그인한 사용자 계정 삭제"""
    db.delete(current_user)
    db.commit()
    return {"message": "User account deleted successfully"}
