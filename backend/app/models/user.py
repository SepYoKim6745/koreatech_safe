from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    username = Column(String)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)

    # 사용자 메타데이터 및 접속 정보
    last_login = Column(DateTime, nullable=True)
    last_ip = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)

    # 1:N 관계 - 유저는 여러 채팅 세션을 가질 수 있음
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
