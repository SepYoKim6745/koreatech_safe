from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat
from app.config import settings
from app.core.database import engine, Base

# DB 테이블 생성 (앱 시작 시)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Qwen2.5-VL 기반 멀티모달 챗봇 API"
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
