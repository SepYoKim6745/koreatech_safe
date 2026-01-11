#!/bin/bash

# VLM Chatbot 전체 서비스 실행 스크립트
# 사용법: ./start_all.sh [start|stop|status]

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 및 PID 디렉토리 생성
mkdir -p "$LOG_DIR" "$PID_DIR"

# 서비스 시작 함수
start_vllm() {
    echo -e "${BLUE}[1/3] vLLM 서버 시작 중...${NC}"
    # nohup vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
    nohup vllm serve Qwen/Qwen3-VL-8B-Instruct \
        --port 8000 \
        --tensor-parallel-size 1 \
        --gpu-memory-utilization 0.9 \
        --max-model-len 4096 \
        --skip-mm-profiling \
        > "$LOG_DIR/vllm.log" 2>&1 &
    echo $! > "$PID_DIR/vllm.pid"
    echo -e "${GREEN}✓ vLLM 서버 시작됨 (PID: $!)${NC}"
}

start_backend() {
    echo -e "${BLUE}[2/3] 백엔드 서버 시작 중...${NC}"
    cd "$PROJECT_DIR/backend"
    nohup uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
    echo -e "${GREEN}✓ 백엔드 서버 시작됨 (PID: $!)${NC}"
    cd "$PROJECT_DIR"
}

start_frontend() {
    echo -e "${BLUE}[3/3] 프론트엔드 서버 시작 중...${NC}"
    cd "$PROJECT_DIR/frontend"
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
    echo -e "${GREEN}✓ 프론트엔드 서버 시작됨 (PID: $!)${NC}"
    cd "$PROJECT_DIR"
}

# 서비스 중지 함수
stop_service() {
    local name=$1
    local pid_file="$PID_DIR/$name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            sleep 1
            # 프로세스가 아직 살아있으면 강제 종료
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
            echo -e "${YELLOW}✓ $name 중지됨 (PID: $pid)${NC}"
        else
            echo -e "${RED}✗ $name 프로세스가 이미 종료됨${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${RED}✗ $name PID 파일 없음${NC}"
    fi
}

stop_all() {
    echo -e "${YELLOW}모든 서비스 중지 중...${NC}"
    stop_service "frontend"
    stop_service "backend"
    stop_service "vllm"
    echo -e "${GREEN}모든 서비스 중지 완료${NC}"
}

# 서비스 상태 확인 함수
check_status() {
    echo -e "${BLUE}=== 서비스 상태 ===${NC}"
    
    for service in vllm backend frontend; do
        local pid_file="$PID_DIR/$service.pid"
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}✓ $service: 실행 중 (PID: $pid)${NC}"
            else
                echo -e "${RED}✗ $service: 중지됨 (PID 파일 존재하지만 프로세스 없음)${NC}"
            fi
        else
            echo -e "${RED}✗ $service: 중지됨${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}=== 로그 파일 위치 ===${NC}"
    echo "  vLLM:      $LOG_DIR/vllm.log"
    echo "  Backend:   $LOG_DIR/backend.log"
    echo "  Frontend:  $LOG_DIR/frontend.log"
}

# 로그 보기 함수
show_logs() {
    local service=$1
    local log_file="$LOG_DIR/$service.log"
    
    if [ -f "$log_file" ]; then
        echo -e "${BLUE}=== $service 로그 (최근 50줄) ===${NC}"
        tail -50 "$log_file"
    else
        echo -e "${RED}로그 파일이 없습니다: $log_file${NC}"
    fi
}

# 메인 로직
case "${1:-start}" in
    start)
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}   VLM Chatbot 서비스 시작${NC}"
        echo -e "${GREEN}========================================${NC}"
        start_vllm
        sleep 2
        start_backend
        sleep 1
        start_frontend
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}   모든 서비스 시작 완료!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo -e "로그 확인: ${YELLOW}tail -f $LOG_DIR/*.log${NC}"
        echo -e "상태 확인: ${YELLOW}$0 status${NC}"
        echo -e "서비스 중지: ${YELLOW}$0 stop${NC}"
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        $0 start
        ;;
    status)
        check_status
        ;;
    logs)
        if [ -z "$2" ]; then
            echo "사용법: $0 logs [vllm|backend|frontend]"
        else
            show_logs "$2"
        fi
        ;;
    *)
        echo "사용법: $0 {start|stop|restart|status|logs [서비스명]}"
        echo ""
        echo "명령어:"
        echo "  start   - 모든 서비스 시작"
        echo "  stop    - 모든 서비스 중지"
        echo "  restart - 모든 서비스 재시작"
        echo "  status  - 서비스 상태 확인"
        echo "  logs    - 특정 서비스 로그 보기 (vllm, backend, frontend)"
        exit 1
        ;;
esac

