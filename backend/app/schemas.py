from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# --- 요청/응답 스키마 (Pydantic) ---

class ChatRequest(BaseModel):
    """채팅 요청 모델"""
    message: str
    images: Optional[List[str]] = None  # base64 인코딩된 이미지 배열
    history: List[dict] = Field(default_factory=list)
    session_id: Optional[int] = None # 세션 ID (선택 사항)

class ChatResponse(BaseModel):
    """채팅 응답 모델"""
    response: str
    model: str
    session_id: Optional[int] = None # 세션 ID 반환

class ChatSessionCreate(BaseModel):
    """채팅방 생성 요청"""
    title: Optional[str] = "새로운 채팅"

class ChatSessionUpdate(BaseModel):
    """채팅방 수정 요청"""
    title: str

class ChatSessionResponse(BaseModel):
    """채팅방 정보 응답"""
    id: int
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True # ORM 모델에서 변환 가능하도록 설정 (구 orm_mode)

class ChatMessageResponse(BaseModel):
    """메시지 정보 응답"""
    id: int
    role: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
