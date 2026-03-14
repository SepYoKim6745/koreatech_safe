from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Literal
from datetime import datetime
import re

# --- Auth Schemas ---

class UserBase(BaseModel):
    email: EmailStr  # 이메일 형식 검증
    username: Optional[str] = None

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("비밀번호는 최소 8자 이상이어야 합니다.")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("비밀번호에 영문자가 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자가 포함되어야 합니다.")
        return v

class UserResponse(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    last_ip: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True

class AdminUserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class AdminPasswordReset(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("비밀번호는 최소 8자 이상이어야 합니다.")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("비밀번호에 영문자가 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자가 포함되어야 합니다.")
        return v

class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    success: bool = True
    message: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

# --- 요청/응답 스키마 (Pydantic) ---

class ChatRequest(BaseModel):
    """채팅 요청 모델"""
    message: str
    images: Optional[List[str]] = None  # base64 인코딩된 이미지 배열
    documents: Optional[List[str]] = None # base64 인코딩된 문서 배열 (PDF 등)
    file_names: Optional[List[str]] = None # 파일 이름 목록 (images + documents 순서)
    history: List[dict] = Field(default_factory=list)
    session_id: Optional[int] = None # 세션 ID (선택 사항)

class ChatResponse(BaseModel):
    """채팅 응답 모델"""
    response: str
    model: str
    session_id: Optional[int] = None # 세션 ID 반환
    files: Optional[List[dict]] = None # 방금 보낸 파일 정보 반환

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
    image_url: Optional[str] = None # 하위 호환성 유지
    files: Optional[List[dict]] = None # 상세 파일 정보
    created_at: datetime
    report_status: Optional[str] = None # 'pending', 'resolved' 또는 None

    class Config:
        from_attributes = True

# --- 신고(Report) 관련 스키마 ---

class ReportCreate(BaseModel):
    """신고 생성 요청"""
    message_id: int
    reason: Optional[str] = None

class ReportResponse(BaseModel):
    """신고 응답"""
    id: int
    message_id: int
    user_id: int
    reason: Optional[str] = None
    status: str
    created_at: datetime

    # 상세 정보 (선택 사항)
    message_content: Optional[str] = None
    reporter_username: Optional[str] = None
    session_id: Optional[int] = None

    class Config:
        from_attributes = True

class GroupedReportResponse(BaseModel):
    """사용자별로 그룹화된 신고 응답"""
    user_id: int
    username: str
    total_report_count: int
    pending_count: int # 처리 중인 신고 수
    latest_report_at: datetime
    reported_session_ids: List[int] # 신고가 발생한 세션 ID 목록

    class Config:
        from_attributes = True
