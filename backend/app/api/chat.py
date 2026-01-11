from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import base64

from app.schemas import (
    ChatRequest, ChatResponse, ChatSessionResponse, 
    ChatMessageResponse, ChatSessionCreate, ChatSessionUpdate
)
from app.models.chat import ChatSession, ChatMessage
from app.services.vlm_service import vlm_service
from app.config import settings
from app.core.database import get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])

# --- 세션(채팅방) 관련 API ---

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    session_data: ChatSessionCreate, 
    db: Session = Depends(get_db)
):
    """새로운 채팅방 생성"""
    new_session = ChatSession(title=session_data.title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id: int, 
    session_data: ChatSessionUpdate,
    db: Session = Depends(get_db)
):
    """채팅방 정보 수정 (제목 변경 등)"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.title = session_data.title
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """채팅방 목록 조회"""
    sessions = db.query(ChatSession)\
        .order_by(ChatSession.updated_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    return sessions

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(session_id: int, db: Session = Depends(get_db)):
    """특정 채팅방 정보 조회"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: int, 
    db: Session = Depends(get_db)
):
    """특정 채팅방의 메시지 목록 조회"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session.messages

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int, db: Session = Depends(get_db)):
    """채팅방 삭제"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully"}


# --- 메시지 전송 API ---

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest, 
    db: Session = Depends(get_db)
):
    """
    채팅 메시지 전송 및 저장
    - session_id가 없으면 새로운 세션을 생성합니다.
    """
    try:
        # 1. 세션 확인 또는 생성
        session_id = request.session_id
        session = None
        
        if session_id:
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
        else:
            # 첫 메시지 내용을 제목으로 사용하여 세션 생성 (최대 30자)
            title = request.message[:30] + "..." if len(request.message) > 30 else request.message
            session = ChatSession(title=title)
            db.add(session)
            db.commit()
            db.refresh(session)
            session_id = session.id

        # 2. 사용자 메시지 DB 저장
        # 대화 문맥 구성을 위해 이전 메시지 조회 (전체 조회)
        db_history = []
        if session_id:
            previous_messages = db.query(ChatMessage)\
                .filter(ChatMessage.session_id == session_id)\
                .order_by(ChatMessage.created_at.asc())\
                .all()
            
            # 포맷 변환
            for msg in previous_messages:
                content_payload = msg.content
                # 이미지가 있는 경우 (vlm_service 포맷에 맞게 처리 필요하면 확장)
                # 현재는 텍스트만 히스토리로 전달
                db_history.append({
                    "role": msg.role,
                    "content": content_payload
                })

        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message,
            image_url=request.images[0] if request.images else None # 첫 번째 이미지 저장 (임시)
        )
        db.add(user_msg)
        
        # 3. AI 응답 생성
        # 클라이언트가 보낸 history 대신 DB에서 조회한 history 사용
        
        ai_response_text = await vlm_service.chat(
            message=request.message,
            images_base64=request.images,
            history=db_history
        )

        # 4. AI 응답 DB 저장
        ai_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=ai_response_text
        )
        db.add(ai_msg)
        
        # 세션 업데이트 시간 갱신
        session.updated_at = datetime.utcnow()
        
        db.commit()

        return ChatResponse(
            response=ai_response_text,
            model=settings.VLM_MODEL,
            session_id=session_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"채팅 처리 중 오류 발생: {str(e)}")


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """이미지 업로드 (기존 로직 유지)"""
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기는 {settings.MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다."
        )

    file_ext = "." + file.filename.split(".")[-1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식입니다. 허용 형식: {settings.ALLOWED_EXTENSIONS}"
        )

    base64_image = base64.b64encode(content).decode("utf-8")

    return JSONResponse(content={
        "filename": file.filename,
        "base64": f"data:image/{file_ext[1:]};base64,{base64_image}"
    })


@router.get("/health")
async def health_check():
    return {"status": "healthy", "model": settings.VLM_MODEL}