import logging
from openai import OpenAI, NotFoundError
from typing import List, Optional
from app.config import settings


class VLMService:
    """VLM 서비스 클래스"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.client = OpenAI(
            base_url=settings.VLM_BASE_URL,
            api_key=settings.VLM_API_KEY
        )
        self.model = settings.VLM_MODEL
        self.temperature = settings.VLM_TEMPERATURE
        self._model_verified = False

    def _get_available_model_ids(self) -> List[str]:
        models = self.client.models.list()
        return [m.id for m in models.data]

    def _ensure_model_available(self) -> None:
        if self._model_verified:
            return

        available = self._get_available_model_ids()
        if self.model in available:
            self._model_verified = True
            return

        if len(available) == 1:
            resolved = available[0]
            self.logger.warning(
                "VLM_MODEL '%s' not found; falling back to served model '%s'. "
                "Set VLM_MODEL to match /v1/models, or start vLLM with --served-model-name.",
                self.model,
                resolved,
            )
            self.model = resolved
            self._model_verified = True
            return

        raise ValueError(
            "VLM_MODEL이 vLLM에서 서빙 중인 모델명과 다릅니다. "
            f"현재 설정: '{self.model}', 사용 가능: {available}. "
            "vLLM의 /v1/models 결과의 id로 VLM_MODEL을 맞추거나, vLLM 실행 시 --served-model-name을 사용하세요."
        )

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
        self._ensure_model_available()
        messages = self.build_messages(message, image_base64, history)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature
            )
        except NotFoundError as e:
            self._model_verified = False
            available = []
            try:
                available = self._get_available_model_ids()
            except Exception:
                pass
            raise ValueError(
                "요청한 모델이 vLLM에 존재하지 않습니다. "
                f"현재 설정: '{self.model}', 사용 가능: {available}. "
                "vLLM의 /v1/models 결과의 id로 VLM_MODEL을 맞추거나, vLLM 실행 시 --served-model-name을 사용하세요."
            ) from e

        return response.choices[0].message.content


# 싱글톤 인스턴스
vlm_service = VLMService()
