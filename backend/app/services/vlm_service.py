import logging
import base64
import io
import pypdf
from openai import AsyncOpenAI, NotFoundError
from typing import List, Optional
from starlette.concurrency import run_in_threadpool
from app.config import settings


class VLMService:
    """VLM 서비스 클래스"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.client = AsyncOpenAI(
            base_url=settings.VLM_BASE_URL,
            api_key=settings.VLM_API_KEY,
            timeout=300.0  # 타임아웃 5분으로 확장
        )
        self.model = settings.VLM_MODEL
        self.temperature = settings.VLM_TEMPERATURE
        self._model_verified = False

    async def _get_available_model_ids(self) -> List[str]:
        try:
            models = await self.client.models.list()
            return [m.id for m in models.data]
        except Exception as e:
            self.logger.error(f"Failed to fetch models from vLLM: {e}")
            return []

    async def _ensure_model_available(self) -> None:
        if self._model_verified:
            return

        available = await self._get_available_model_ids()
        if not available:
            # vLLM 서버 연결 실패 또는 모델 없음
            self.logger.error("vLLM 서버에 연결할 수 없거나 가용한 모델이 없습니다.")
            return

        if self.model in available:
            self._model_verified = True
            return

        if len(available) == 1:
            resolved = available[0]
            self.logger.warning(
                "VLM_MODEL '%s' not found; falling back to served model '%s'.",
                self.model,
                resolved,
            )
            self.model = resolved
            self._model_verified = True
            return

        self.logger.error(f"VLM_MODEL 설정 오류. 설정: '{self.model}', 사용 가능: {available}")

    def extract_text_from_pdf(self, pdf_base64: str) -> str:
        """PDF Base64 문자열에서 텍스트 추출"""
        try:
            if "," in pdf_base64:
                _, encoded = pdf_base64.split(",", 1)
            else:
                encoded = pdf_base64
            
            pdf_bytes = base64.b64decode(encoded)
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            # 최대 텍스트 길이 제한 (64k 컨텍스트 활용을 위해 약 40,000자 제한)
            MAX_CHARS = 40000 
            
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"--- Page {i+1} ---\n{page_text}\n"
                
                if len(text) > MAX_CHARS:
                    text = text[:MAX_CHARS]
                    text += f"\n\n[시스템 알림: 문서 내용이 너무 길어 앞부분 {MAX_CHARS}자만 포함되었습니다.]"
                    break
                    
            return text
        except Exception as e:
            self.logger.error(f"PDF extraction failed: {e}")
            return "[PDF 변환 오류: 문서를 처리할 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식입니다.]"

    def create_message_content(
        self,
        text: Optional[str] = None,
        images_base64: Optional[List[str]] = None
    ) -> List[dict]:
        """메시지 컨텐츠 생성 (다중 이미지 지원)"""
        contents = []

        if text:
            contents.append({"type": "text", "text": text})

        if images_base64:
            for image_base64 in images_base64:
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
        images_base64: Optional[List[str]] = None,
        history: List[dict] = None
    ) -> List[dict]:
        """채팅 메시지 리스트 생성 (시스템 프롬프트 주입 및 다중 이미지 지원)"""
        messages = []

        # 1. 시스템 프롬프트 주입 (AI의 역할 및 언어 설정 강제)
        messages.append({
            "role": "system",
            "content": [{"type": "text", "text": settings.SYSTEM_PROMPT}]
        })

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

        current_content = self.create_message_content(current_message, images_base64)
        messages.append({
            "role": "user",
            "content": current_content
        })

        return messages

    async def stream_chat(
        self,
        message: str,
        images_base64: Optional[List[str]] = None,
        documents: Optional[List[str]] = None,
        history: List[dict] = None
    ):
        """채팅 응답 스트리밍 생성"""
        await self._ensure_model_available()

        full_message = message
        if documents:
            doc_texts = []
            for doc in documents:
                text = await run_in_threadpool(self.extract_text_from_pdf, doc)
                doc_texts.append(text)
            
            if doc_texts:
                full_message = f"다음은 사용자가 업로드한 문서(PDF)의 내용입니다:\n\n" + "\n".join(doc_texts) + f"\n\n질문: {message}"

        messages = self.build_messages(full_message, images_base64, history)

        try:
            # 반복 방지 및 품질 향상을 위한 옵션 추가
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=settings.VLM_TEMPERATURE,
                top_p=settings.VLM_TOP_P,
                extra_body={
                    "repetition_penalty": settings.VLM_REPETITION_PENALTY,
                    "stop_token_ids": [151643, 151645]  # Qwen 특유의 종료 토큰 ID (필요시)
                },
                stop=["<|im_end|>", "<|endoftext|>"], # 대화 종료 시점 명시
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content

        except Exception as e:
            self.logger.error(f"Error in stream_chat: {str(e)}")
            yield "[오류 발생: AI 응답을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.]"

    async def chat(
        self,
        message: str,
        images_base64: Optional[List[str]] = None,
        documents: Optional[List[str]] = None,
        history: List[dict] = None
    ) -> str:
        """채팅 응답 생성 (다중 이미지 및 문서 지원)"""
        await self._ensure_model_available()

        full_message = message
        if documents:
            doc_texts = []
            for doc in documents:
                text = await run_in_threadpool(self.extract_text_from_pdf, doc)
                doc_texts.append(text)
            
            if doc_texts:
                full_message = f"다음은 사용자가 업로드한 문서(PDF)의 내용입니다:\n\n" + "\n".join(doc_texts) + f"\n\n질문: {message}"

        messages = self.build_messages(full_message, images_base64, history)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=settings.VLM_TEMPERATURE,
                top_p=settings.VLM_TOP_P,
                extra_body={
                    "repetition_penalty": settings.VLM_REPETITION_PENALTY
                },
                stop=["<|im_end|>", "<|endoftext|>"]
            )
            return response.choices[0].message.content
        except Exception as e:
            self.logger.error(f"Error in chat: {str(e)}")
            return "[오류 발생: AI 응답을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.]"



# 싱글톤 인스턴스
vlm_service = VLMService()