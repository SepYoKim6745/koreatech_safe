"""
관리자 계정 관리 스크립트

사용법:
  # 새 관리자 계정 생성 (비밀번호 직접 입력)
  python manage_admin.py create admin@koreatech.ac.kr

  # 기존 사용자를 관리자로 승격
  python manage_admin.py promote user@koreatech.ac.kr

  # 관리자 권한 해제
  python manage_admin.py demote admin@koreatech.ac.kr
"""
import sys
import getpass
import re
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def validate_password(password: str) -> bool:
    if len(password) < 8:
        print("ERROR: 비밀번호는 최소 8자 이상이어야 합니다.")
        return False
    if not re.search(r"[A-Za-z]", password):
        print("ERROR: 비밀번호에 영문자가 포함되어야 합니다.")
        return False
    if not re.search(r"[0-9]", password):
        print("ERROR: 비밀번호에 숫자가 포함되어야 합니다.")
        return False
    return True


def create_admin(email: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"ERROR: {email} 계정이 이미 존재합니다. 'promote' 명령을 사용하세요.")
            return

        username = input("이름(닉네임): ").strip() or email.split("@")[0]

        while True:
            password = getpass.getpass("비밀번호 (8자 이상, 영문+숫자): ")
            if not validate_password(password):
                continue
            confirm = getpass.getpass("비밀번호 확인: ")
            if password != confirm:
                print("ERROR: 비밀번호가 일치하지 않습니다.")
                continue
            break

        new_admin = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            is_admin=True
        )
        db.add(new_admin)
        db.commit()
        print(f"Admin account created: {email}")
    finally:
        db.close()


def promote_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"ERROR: {email} 사용자를 찾을 수 없습니다.")
            return
        if user.is_admin:
            print(f"{email} 은(는) 이미 관리자입니다.")
            return

        user.is_admin = True
        db.commit()
        print(f"{email} → 관리자로 승격되었습니다.")
    finally:
        db.close()


def demote_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"ERROR: {email} 사용자를 찾을 수 없습니다.")
            return
        if not user.is_admin:
            print(f"{email} 은(는) 이미 일반 사용자입니다.")
            return

        user.is_admin = False
        db.commit()
        print(f"{email} → 관리자 권한이 해제되었습니다.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python manage_admin.py create <email>    # 새 관리자 계정 생성")
        print("  python manage_admin.py promote <email>   # 기존 사용자를 관리자로 승격")
        print("  python manage_admin.py demote <email>    # 관리자 권한 해제")
        sys.exit(1)

    command = sys.argv[1]
    email = sys.argv[2]

    if command == "create":
        create_admin(email)
    elif command == "promote":
        promote_user(email)
    elif command == "demote":
        demote_user(email)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
