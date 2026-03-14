from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api import chat, auth, admin
from app.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models import user, chat as chat_model  # 모델 로드 (테이블 생성을 위해)

# DB 테이블 생성 (앱 시작 시)
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 lifespan 컨텍스트"""
    # Startup: 고아 데이터 정리
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

            # 3. 존재하지 않는 채팅방의 메시지 삭제 (잔여 데이터)
            db.execute(text("DELETE FROM chat_messages WHERE session_id NOT IN (SELECT id FROM chat_sessions)"))

            # 4. 존재하지 않는 메시지의 신고 삭제
            db.execute(text("DELETE FROM reports WHERE message_id NOT IN (SELECT id FROM chat_messages)"))

            # 5. 존재하지 않는 사용자의 신고 삭제
            db.execute(text("DELETE FROM reports WHERE user_id NOT IN (SELECT id FROM users)"))

            db.commit()
            print("INFO: Orphaned data cleanup completed.")
    except Exception as e:
        print(f"WARNING: Orphaned data cleanup failed: {e}")

    yield  # 앱 실행 중

    # Shutdown: 필요 시 정리 작업


app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Qwen3-VL 기반 멀티모달 챗봇 API",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)


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
        reload=False
    )
