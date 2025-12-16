from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ImageContent(BaseModel):
    """이미지 컨텐츠 모델"""
    type: Literal["image_url"] = "image_url"
    image_url: dict


class TextContent(BaseModel):
    """텍스트 컨텐츠 모델"""
    type: Literal["text"] = "text"
    text: str


class ChatMessage(BaseModel):
    """채팅 메시지 모델"""
    role: Literal["user", "assistant", "system"]
    content: List[dict]


class ChatRequest(BaseModel):
    """채팅 요청 모델"""
    message: str
    image: Optional[str] = None  # base64 인코딩된 이미지
    history: List[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """채팅 응답 모델"""
    response: str
    model: str
