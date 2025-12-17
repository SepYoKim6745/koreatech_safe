from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import base64
from app.models import ChatRequest, ChatResponse
from app.services.vlm_service import vlm_service
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    채팅 메시지 전송

    - **message**: 사용자 메시지 (텍스트)
    - **images**: base64 인코딩된 이미지 배열 (선택사항)
    - **history**: 대화 히스토리 (선택사항)
    """
    try:
        response = await vlm_service.chat(
            message=request.message,
            images_base64=request.images,
            history=request.history
        )

        return ChatResponse(
            response=response,
            model=settings.VLM_MODEL
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 처리 중 오류 발생: {str(e)}")


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    이미지 업로드 및 base64 인코딩

    - **file**: 업로드할 이미지 파일
    """
    # 파일 크기 확인
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 {settings.MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다."
        )

    # 파일 확장자 확인
    file_ext = "." + file.filename.split(".")[-1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식입니다. 허용 형식: {settings.ALLOWED_EXTENSIONS}"
        )

    # base64 인코딩
    base64_image = base64.b64encode(content).decode("utf-8")

    return JSONResponse(content={
        "filename": file.filename,
        "base64": f"data:image/{file_ext[1:]};base64,{base64_image}"
    })


@router.get("/health")
async def health_check():
    """API 헬스 체크"""
    return {"status": "healthy", "model": settings.VLM_MODEL}
