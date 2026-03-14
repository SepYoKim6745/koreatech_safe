from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
# User model import is not strictly needed here for string-based relationship, but good practice if needed later.
# However, to avoid circular imports during runtime, string reference is fine.

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="새로운 채팅")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # 1:N 관계 설정 (하나의 세션에 여러 메시지)
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    # N:1 관계 - 세션은 한 명의 유저에게 속함
    user = relationship("User", back_populates="sessions")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text) # 메시지 내용 (Markdown 텍스트)
    image_url = Column(Text, nullable=True) # 이미지 경로 또는 base64 (일단 텍스트로 저장)
    created_at = Column(DateTime, default=datetime.utcnow)

    # N:1 관계 설정
    session = relationship("ChatSession", back_populates="messages")
    reports = relationship("Report", back_populates="message", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String, nullable=True) # 신고 사유
    status = Column(String, default="pending") # 'pending', 'resolved'
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계 설정
    message = relationship("ChatMessage", back_populates="reports")
    user = relationship("User", back_populates="reports")
