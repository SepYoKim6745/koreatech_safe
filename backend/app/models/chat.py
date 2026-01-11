from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="새로운 채팅")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 1:N 관계 설정 (하나의 세션에 여러 메시지)
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text) # 메시지 내용 (Markdown 텍스트)
    image_url = Column(Text, nullable=True) # 이미지 경로 또는 base64 (일단 텍스트로 저장)
    created_at = Column(DateTime, default=datetime.utcnow)

    # N:1 관계 설정
    session = relationship("ChatSession", back_populates="messages")
