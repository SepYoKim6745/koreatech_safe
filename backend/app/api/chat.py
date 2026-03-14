from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Annotated
from datetime import datetime
import base64
import json
from jose import JWTError, jwt

from app.schemas import (
    ChatRequest, ChatResponse, ChatSessionResponse, 
    ChatMessageResponse, ChatSessionCreate, ChatSessionUpdate, TokenData,
    ReportCreate
)
from app.models.chat import ChatSession, ChatMessage, Report
from app.models.user import User
from app.services.vlm_service import vlm_service
from app.config import settings
from app.core.database import get_db, SessionLocal
from app.dependencies import get_current_user, oauth2_scheme

router = APIRouter(prefix="/api/chat", tags=["chat"])

# --- 세션(채팅방) 관련 API ---

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    session_data: ChatSessionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """새로운 채팅방 생성"""
    new_session = ChatSession(title=session_data.title, user_id=current_user.id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id: int, 
    session_data: ChatSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """채팅방 정보 수정 (제목 변경 등)"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """채팅방 목록 조회"""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sessions

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 채팅방 정보 조회"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 채팅방의 메시지 목록 조회"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
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
                    files_data = [{"type": "image", "preview": msg.image_url}]
            else:
                files_data = [{"type": "image", "preview": msg.image_url}]
        
        # 신고 상태 확인
        report_status = None
        if msg.reports:
            # 하나라도 pending이면 pending, 모두 resolved면 resolved
            if any(r.status == "pending" for r in msg.reports):
                report_status = "pending"
            else:
                report_status = "resolved"

        response_messages.append(ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            image_url=msg.image_url,
            files=files_data,
            created_at=msg.created_at,
            report_status=report_status
        ))
    
    return response_messages

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """채팅방 삭제"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully"}


# --- 메시지 전송 API ---

@router.post("/stream", response_class=StreamingResponse)
async def stream_message(
    request: ChatRequest, 
    token: str = Depends(oauth2_scheme)
):
    """
    채팅 메시지 스트리밍 전송 (DB 세션 점유 최소화)
    """
    try:
        # 1. 토큰 검증 및 사용자 ID 조회
        user_id = None
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        with SessionLocal() as auth_db:
            user = auth_db.query(User).filter(User.email == email).first()
            if user is None:
                raise credentials_exception
            user_id = user.id

        # 2. 채팅 세션 및 메시지 초기 처리 (히스토리 로드)
        db_history = []
        session_id = request.session_id
        
        with SessionLocal() as db:
            if session_id:
                session = db.query(ChatSession).filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id
                ).first()
                if not session:
                    raise HTTPException(status_code=404, detail="Session not found")
            else:
                title = request.message[:30] + "..." if len(request.message) > 30 else request.message
                session = ChatSession(title=title, user_id=user_id)
                db.add(session)
                db.commit()
                db.refresh(session)
                session_id = session.id

            previous_messages = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(30)
                .all()
            )
            # 최신순으로 가져왔으므로 다시 시간순으로 정렬
            previous_messages.reverse()
            
            for msg in previous_messages:
                db_history.append({
                    "role": msg.role,
                    "content": msg.content
                })

            # 파일 메타데이터 생성
            files_metadata = []
            file_names = request.file_names or []
            current_name_idx = 0
            
            if request.images:
                for img in request.images:
                    name = file_names[current_name_idx] if current_name_idx < len(file_names) else "image.jpg"
                    files_metadata.append({
                        "type": "image",
                        "preview": img if img.startswith("data:") else f"data:image/jpeg;base64,{img}",
                        "fileName": name
                    })
                    current_name_idx += 1
            
            if request.documents:
                for doc in request.documents:
                    name = file_names[current_name_idx] if current_name_idx < len(file_names) else "document.pdf"
                    pdf_icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAAbklEQVRoge3ZwQmAAAyE4Qwn13I8W7iCF7GwvzmCiO/lQA558CCwS+p2u6quZ+Y+576vMzP3/d77zKwFj2OOOY455jjmmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOE45pjjmOOYY45jjjmOOaY5H6wCDZ4w3gqqAAAAAElFTkSuQmCC"
                    files_metadata.append({
                        "type": "document",
                        "preview": pdf_icon,
                        "fileName": name,
                    })
                    current_name_idx += 1

            # 사용자 메시지 저장
            user_msg = ChatMessage(
                session_id=session_id,
                role="user",
                content=request.message,
                image_url=json.dumps(files_metadata) if files_metadata else None
            )
            db.add(user_msg)
            db.commit()
        
        # 3. 스트리밍 제너레이터 (DB 연결을 해제한 상태에서 실행)
        async def generate():
            full_response = ""
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
                
                # 답변 완료 후 DB 저장
                if full_response:
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
            except Exception:
                # 에러 메시지는 이미 stream_chat에서 yield함
                pass

        return StreamingResponse(generate(), media_type="application/x-ndjson")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    채팅 메시지 전송 및 저장 (비스트리밍)
    """
    try:
        session_id = request.session_id
        if session_id:
            session = db.query(ChatSession).filter(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id
            ).first()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
        else:
            title = request.message[:30] + "..." if len(request.message) > 30 else request.message
            session = ChatSession(title=title, user_id=current_user.id)
            db.add(session)
            db.commit()
            db.refresh(session)
            session_id = session.id

        db_history = []
        previous_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        for msg in previous_messages:
            db_history.append({"role": msg.role, "content": msg.content})

        files_metadata = []
        # (생략: stream_message와 동일한 로직으로 metadata 구성 가능)

        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message,
            image_url=json.dumps(files_metadata) if files_metadata else None
        )
        db.add(user_msg)
        
        ai_response_text = await vlm_service.chat(
            message=request.message,
            images_base64=request.images,
            documents=request.documents,
            history=db_history
        )

        ai_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=ai_response_text
        )
        db.add(ai_msg)
        session.updated_at = datetime.utcnow()
        db.commit()

        return ChatResponse(
            response=ai_response_text,
            model=settings.VLM_MODEL,
            session_id=session_id,
            files=files_metadata
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"채팅 처리 중 오류 발생: {str(e)}")

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """이미지 업로드 (인증 필요)"""
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

@router.post("/report")
async def report_message(
    report_data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """메시지 신고"""
    # 1. 메시지 존재 여부 확인
    message = db.query(ChatMessage).filter(ChatMessage.id == report_data.message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # 2. 이미 신고했는지 확인하여 있으면 갱신(Update)
    existing_report = db.query(Report).filter(
        Report.message_id == report_data.message_id,
        Report.user_id == current_user.id
    ).first()
    
    if existing_report:
        existing_report.reason = report_data.reason
        existing_report.created_at = datetime.utcnow()
        db.commit()
        return {"message": "Report updated successfully", "report_id": existing_report.id}
    
    # 3. 새로운 신고 저장
    new_report = Report(
        message_id=report_data.message_id,
        user_id=current_user.id,
        reason=report_data.reason
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    return {"message": "Reported successfully", "report_id": new_report.id}
