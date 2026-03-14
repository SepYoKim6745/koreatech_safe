from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json
from app.core.database import get_db
from app.dependencies import get_current_admin_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, Report
from app.schemas import (
    UserResponse, ChatSessionResponse, ChatMessageResponse, 
    ReportResponse, GroupedReportResponse, AdminUserUpdate, AdminPasswordReset
)
from app.core.security import get_password_hash
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["admin"])

class AdminChatSessionResponse(BaseModel):
    id: int
    title: str
    user_id: int
    username: Optional[str]
    email: str
    created_at: datetime
    updated_at: Optional[datetime]
    message_count: int
    report_count: int = 0
    pending_count: int = 0

    class Config:
        from_attributes = True

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """모든 사용자 목록 조회"""
    return db.query(User).all()

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """사용자 삭제"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_info(
    user_id: int,
    user_data: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """사용자 기본 정보 수정 (아이디/이메일 등)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.username is not None:
        user.username = user_data.username
    if user_data.email is not None:
        # 이메일 중복 체크 (본인 제외)
        existing = db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_data.email
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
        
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    password_data: AdminPasswordReset,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """사용자 비밀번호 초기화/변경"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/users/{user_id}/chats", response_model=List[AdminChatSessionResponse])
async def list_user_chats(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """특정 사용자의 채팅 세션 목록 조회 (최근 활동순)"""
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()
    result = []
    for s in sessions:
        # 이 세션에 포함된 신고 수 계산
        reports = db.query(Report).join(ChatMessage).filter(ChatMessage.session_id == s.id).all()
        report_count = len(reports)
        pending_count = len([r for r in reports if r.status == "pending"])

        result.append(AdminChatSessionResponse(
            id=s.id,
            title=s.title,
            user_id=s.user_id,
            username=s.user.username,
            email=s.user.email,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages),
            report_count=report_count,
            pending_count=pending_count
        ))
    return result

@router.get("/chats", response_model=List[AdminChatSessionResponse])
async def list_all_chats(
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """모든 사용자의 채팅 세션 목록 조회 (키워드 검색 가능)"""
    query = db.query(ChatSession)
    
    if keyword:
        # 제목 또는 대화 내용에 키워드가 포함된 경우 필터링
        query = query.join(ChatMessage).filter(
            (ChatSession.title.ilike(f"%{keyword}%")) | 
            (ChatMessage.content.ilike(f"%{keyword}%"))
        ).distinct()
        
    sessions = query.order_by(ChatSession.updated_at.desc()).all()
    result = []
    for s in sessions:
        # 이 세션에 포함된 신고 수 계산
        reports = db.query(Report).join(ChatMessage).filter(ChatMessage.session_id == s.id).all()
        report_count = len(reports)
        pending_count = len([r for r in reports if r.status == "pending"])

        result.append(AdminChatSessionResponse(
            id=s.id,
            title=s.title,
            user_id=s.user_id,
            username=s.user.username,
            email=s.user.email,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages),
            report_count=report_count,
            pending_count=pending_count
        ))
    return result

@router.get("/chats/{session_id}", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """특정 채팅 세션의 모든 메시지 조회"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # DB 모델 -> 스키마 변환 (이미지 데이터 파싱)
    response_messages = []
    for msg in session.messages:
        files_data = []
        if msg.image_url:
            cleaned_url = msg.image_url.strip()
            if cleaned_url.startswith("[") and cleaned_url.endswith("]"):
                try:
                    files_data = json.loads(cleaned_url)
                except Exception as e:
                    print(f"JSON parsing error: {e}")
                    files_data = [{"type": "image", "preview": msg.image_url}]
            else:
                files_data = [{"type": "image", "preview": msg.image_url}]
        
        # 신고 상태 확인
        report_status = None
        if msg.reports:
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
    
    print(f"DEBUG: Sending {len(response_messages)} messages for session {session_id}")
    if response_messages:
        print(f"DEBUG: First message files: {response_messages[0].files}")
    
    return response_messages

@router.delete("/chats/{session_id}")
async def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """채팅 세션 삭제"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted successfully"}

@router.get("/reports", response_model=List[GroupedReportResponse])
async def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """모든 신고 내역을 사용자별로 그룹화하여 조회 (상태 포함)"""
    reports = db.query(Report).all()
    user_groups = {}
    
    for r in reports:
        u_id = r.user_id
        if u_id not in user_groups:
            user_groups[u_id] = {
                "user_id": u_id,
                "username": r.user.username,
                "total_report_count": 0,
                "pending_count": 0,
                "latest_report_at": r.created_at,
                "reported_session_ids": set()
            }
        
        group = user_groups[u_id]
        group["total_report_count"] += 1
        if r.status == "pending":
            group["pending_count"] += 1
            
        if r.created_at > group["latest_report_at"]:
            group["latest_report_at"] = r.created_at
        group["reported_session_ids"].add(r.message.session_id)
    
    result = []
    for g in user_groups.values():
        g["reported_session_ids"] = list(g["reported_session_ids"])
        result.append(GroupedReportResponse(**g))
    
    return result

@router.get("/reports/session/{session_id}/user/{user_id}")
async def get_report_details(
    session_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """특정 세션 및 유저와 관련된 신고 상세 정보 조회 (상태 포함)"""
    reports = db.query(Report).join(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        Report.user_id == user_id
    ).all()
    
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this session and user")
    
    return {
        "session_id": session_id,
        "user_id": user_id,
        "report_count": len(reports),
        "pending_count": len([r for r in reports if r.status == "pending"]),
        "reported_message_ids": [r.message_id for r in reports],
        "reasons": [{"message_id": r.message_id, "reason": r.reason, "status": r.status} for r in reports],
        "latest_at": max(r.created_at for r in reports)
    }

@router.put("/reports/session/{session_id}/user/{user_id}/resolve")
async def resolve_session_reports(
    session_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """특정 세션의 해당 유저 신고 건을 '처리 완료'로 변경"""
    reports = db.query(Report).join(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        Report.user_id == user_id,
        Report.status == "pending"
    ).all()
    
    for r in reports:
        r.status = "resolved"
    
    db.commit()
    return {"message": f"Successfully resolved {len(reports)} reports"}

@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """신고 내역 삭제 (무시 처리)"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

@router.delete("/reports/session/{session_id}/user/{user_id}")
async def delete_session_reports(
    session_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """특정 세션에서 해당 유저가 한 모든 신고 내역 삭제"""
    reports = db.query(Report).join(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        Report.user_id == user_id
    ).all()
    
    for r in reports:
        db.delete(r)
    
    db.commit()
    return {"message": f"Successfully deleted {len(reports)} reports"}
