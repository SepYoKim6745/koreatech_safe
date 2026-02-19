from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api import chat, auth
from app.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models import user, chat as chat_model # 모델 로드 (테이블 생성을 위해)

# DB 테이블 생성 (앱 시작 시)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Qwen3-VL 기반 멀티모달 챗봇 API"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 고아 데이터(삭제된 사용자의 채팅 기록) 정리
@app.on_event("startup")
def clean_orphaned_data():
    try:
        with SessionLocal() as db:
            # 1. 존재하지 않는 사용자의 채팅방에 속한 메시지 삭제
            db.execute(text("""
                DELETE FROM chat_messages 
                WHERE session_id IN (
                    SELECT id FROM chat_sessions 
                    WHERE user_id NOT IN (SELECT id FROM users)
                )
            """))
            
            # 2. 존재하지 않는 사용자의 채팅방 삭제
            db.execute(text("DELETE FROM chat_sessions WHERE user_id NOT IN (SELECT id FROM users)"))
            
            # 3. 존재하지 않는 채팅방의 메시지 삭제 (혹시 모를 잔여 데이터)
            db.execute(text("DELETE FROM chat_messages WHERE session_id NOT IN (SELECT id FROM chat_sessions)"))
            
            db.commit()
            print("INFO: Orphaned data cleanup completed.")
    except Exception as e:
        print(f"WARNING: Orphaned data cleanup failed: {e}")

# 라우터 등록
app.include_router(auth.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "VLM Chatbot API",
        "version": settings.API_VERSION,
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
