from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite 데이터베이스 파일 경로
# 프로젝트 루트/backend/koreatech_safe.db 에 생성됩니다.
DB_URL = "sqlite:///./koreatech_safe.db"

# connect_args={"check_same_thread": False}는 SQLite에서만 필요합니다.
# 하나의 요청-응답 사이클 안에서 여러 스레드가 DB에 접근할 수 있게 허용합니다.
engine = create_engine(
    DB_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 의존성 주입(Dependency Injection)을 위한 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
