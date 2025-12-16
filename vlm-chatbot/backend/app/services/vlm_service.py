from openai import OpenAI
from typing import List, Optional
import base64
from app.config import settings
from app.models import ChatMessage


class VLMService:
    """VLM 서비스 클래스"""

    def __init__(self):
        self.client = OpenAI(
            base_url=settings.VLM_BASE_URL,
            api_key=settings.VLM_API_KEY
        )
        self.model = settings.VLM_MODEL
        self.temperature = settings.VLM_TEMPERATURE

    def create_message_content(
        self,
        text: Optional[str] = None,
        image_base64: Optional[str] = None
    ) -> List[dict]:
        """메시지 컨텐츠 생성"""
        contents = []

        if text:
            contents.append({"type": "text", "text": text})

        if image_base64:
            # base64 문자열이 data URL 형식인지 확인
            if not image_base64.startswith("data:"):
                image_base64 = f"data:image/jpeg;base64,{image_base64}"

            contents.append({
                "type": "image_url",
                "image_url": {"url": image_base64}
            })

        return contents

    def build_messages(
        self,
        current_message: str,
        image_base64: Optional[str] = None,
        history: List[dict] = None
    ) -> List[dict]:
        """채팅 메시지 리스트 생성"""
        messages = []

        # 히스토리 추가
        if history:
            for msg in history:
                role = msg.get("role", "user")
                content = msg.get("content", "")

                if isinstance(content, str):
                    messages.append({
                        "role": role,
                        "content": [{"type": "text", "text": content}]
                    })
                else:
                    messages.append({
                        "role": role,
                        "content": content
                    })

        # 현재 메시지 추가
        current_content = self.create_message_content(current_message, image_base64)
        messages.append({
            "role": "user",
            "content": current_content
        })

        return messages

    async def chat(
        self,
        message: str,
        image_base64: Optional[str] = None,
        history: List[dict] = None
    ) -> str:
        """채팅 응답 생성"""
        messages = self.build_messages(message, image_base64, history)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature
        )

        return response.choices[0].message.content


# 싱글톤 인스턴스
vlm_service = VLMService()
