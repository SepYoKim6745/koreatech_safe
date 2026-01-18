from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import base64
import json

from app.schemas import (
    ChatRequest, ChatResponse, ChatSessionResponse, 
    ChatMessageResponse, ChatSessionCreate, ChatSessionUpdate
)
from app.models.chat import ChatSession, ChatMessage
from app.services.vlm_service import vlm_service
from app.config import settings
from app.core.database import get_db, SessionLocal

router = APIRouter(prefix="/api/chat", tags=["chat"])

# --- 세션(채팅방) 관련 API ---
# ... (existing code) ...

# --- 메시지 전송 API ---

@router.post("/stream", response_class=StreamingResponse)
async def stream_message(
    request: ChatRequest, 
    db: Session = Depends(get_db)
):
    """
    채팅 메시지 스트리밍 전송
    - NDJSON 형식으로 응답: {"type": "token", "content": "..."} 또는 {"type": "session_id", "id": ...}
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
            # 첫 메시지 내용을 제목으로 사용하여 세션 생성
            title = request.message[:30] + "..." if len(request.message) > 30 else request.message
            session = ChatSession(title=title)
            db.add(session)
            db.commit()
            db.refresh(session)
            session_id = session.id

        # 2. 사용자 메시지 DB 저장 (히스토리 구성 포함)
        db_history = []
        if session_id:
            previous_messages = db.query(ChatMessage)\
                .filter(ChatMessage.session_id == session_id)\
                .order_by(ChatMessage.created_at.asc())\
                .all()
            
            for msg in previous_messages:
                db_history.append({
                    "role": msg.role,
                    "content": msg.content
                })

        # 파일 메타데이터 구성 (JSON 저장)
        files_metadata = []
        file_names = request.file_names or []
        current_name_idx = 0
        
        # 이미지 처리
        if request.images:
            for img in request.images:
                name = file_names[current_name_idx] if current_name_idx < len(file_names) else "image.jpg"
                files_metadata.append({
                    "type": "image",
                    "preview": img if img.startswith("data:") else f"data:image/jpeg;base64,{img}",
                    "fileName": name
                })
                current_name_idx += 1
        
        # 문서 처리
        if request.documents:
            for doc in request.documents:
                name = file_names[current_name_idx] if current_name_idx < len(file_names) else "document.pdf"
                # PDF 미리보기용 아이콘(상수) 사용
                pdf_icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAAbklEQVRoge3ZwQmAAAyE4Qwn13I8W7iCF7GwvzmCiO/lQA558CCwS+p2u6quZ+Y+576vMzP3/d77zKwFj2OOOY455jjmmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOaY5H6wCDZ4w3gqqAAAAAElFTkSuQmCC"
                files_metadata.append({
                    "type": "document",
                    "preview": pdf_icon,
                    "fileName": name,
                    # 실제 데이터는 DB 용량 문제로 일단 저장 안함 (필요시 별도 테이블 권장) 
                    # 하지만 현재 구조상 content 추출용으로만 쓰고 뷰어용으로는 저장 안하는게 나을수도 있음.
                    # 일단은 UI 일관성을 위해 아이콘만 저장.
                    # *중요*: 원본 PDF base64는 너무 커서 TEXT 컬럼에 넣으면 에러 날 수 있음. 
                })
                current_name_idx += 1

        user_msg_content = request.message
        user_msg_image_url = json.dumps(files_metadata) if files_metadata else None

        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=user_msg_content,
            image_url=user_msg_image_url
        )
        db.add(user_msg)
        db.commit()
        
        # 3. 스트리밍 제너레이터
        async def generate():
            full_response = ""
            
            # 세션 ID 전송
            yield json.dumps({"type": "session_id", "id": session_id}) + "\n"
            
            try:
                async for chunk in vlm_service.stream_chat(
                    message=request.message,
                    images_base64=request.images,
                    documents=request.documents,
                    history=db_history
                ):
                    full_response += chunk
                    yield json.dumps({"type": "token", "content": chunk}) + "\n"
                
                # 4. 완료 후 AI 메시지 저장 (새 세션 사용)
                with SessionLocal() as db_final:
                    ai_msg = ChatMessage(
                        session_id=session_id,
                        role="assistant",
                        content=full_response
                    )
                    db_final.add(ai_msg)
                    
                    sess = db_final.query(ChatSession).filter(ChatSession.id == session_id).first()
                    if sess:
                        sess.updated_at = datetime.utcnow()
                    db_final.commit()
                    
            except Exception as e:
                yield json.dumps({"type": "error", "content": str(e)}) + "\n"

        return StreamingResponse(generate(), media_type="application/x-ndjson")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message", response_model=ChatResponse)
# ... existing send_message ...

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
    
    # DB 모델 -> 스키마 변환 (수동 매핑 필요)
    response_messages = []
    for msg in session.messages:
        files_data = []
        if msg.image_url:
            if msg.image_url.strip().startswith("[") and msg.image_url.strip().endswith("]"):
                try:
                    import json
                    files_data = json.loads(msg.image_url)
                except:
                    # JSON 파싱 실패 시 기존 방식(단일 이미지)으로 처리
                    files_data = [{"type": "image", "preview": msg.image_url}]
            else:
                # 기존 데이터 (단일 URL)
                files_data = [{"type": "image", "preview": msg.image_url}]
        
        response_messages.append(ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            image_url=msg.image_url, # 하위 호환
            files=files_data,
            created_at=msg.created_at
        ))
    
    return response_messages

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
                db_history.append({
                    "role": msg.role,
                    "content": content_payload
                })

        # 파일 메타데이터 구성 (JSON 저장)
        files_metadata = []
        file_names = request.file_names or []
        current_name_idx = 0
        
        # 이미지 처리
        if request.images:
            for img in request.images:
                name = file_names[current_name_idx] if current_name_idx < len(file_names) else "image.jpg"
                files_metadata.append({
                    "type": "image",
                    "preview": img if img.startswith("data:") else f"data:image/jpeg;base64,{img}",
                    "fileName": name
                })
                current_name_idx += 1
        
        # 문서 처리
        if request.documents:
            for doc in request.documents:
                name = file_names[current_name_idx] if current_name_idx < len(file_names) else "document.pdf"
                pdf_icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAAbklEQVRoge3ZwQmAAAyE4Qwn13I8W7iCF7GwvzmCiO/lQA558CCwS+p2u6quZ+Y+576vMzP3/d77zKwFj2OOOY455jjmmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOaY5H6wCDZ4w3gqqAAAAAElFTkSuQmCC"
                files_metadata.append({
                    "type": "document",
                    "preview": pdf_icon,
                    "fileName": name
                })
                current_name_idx += 1

        user_msg_image_url = json.dumps(files_metadata) if files_metadata else None

        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message,
            image_url=user_msg_image_url
        )
        db.add(user_msg)
        
        # 3. AI 응답 생성
        # 클라이언트가 보낸 history 대신 DB에서 조회한 history 사용
        
        ai_response_text = await vlm_service.chat(
            message=request.message,
            images_base64=request.images,
            documents=request.documents,
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
            session_id=session_id,
            files=files_metadata # 저장된 파일 메타데이터 반환
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