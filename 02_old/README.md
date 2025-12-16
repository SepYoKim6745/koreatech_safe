# 멀티모달 챗봇 (vLLM + Qwen2.5-VL-7B)

이미지와 텍스트를 동시에 처리하는 비전-언어 모델(VLM) 기반 챗봇입니다.

## 🚀 빠른 시작

```bash
# 1. 환경 활성화
conda activate safe_qwen

# 2. vLLM 서버 실행 (백그라운드)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
    --port 8000 \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.8 \
    --max-model-len 4096 > vllm_server.log 2>&1 &

# 3. 서버 준비 확인 (1-2분 대기 후)
curl http://127.0.0.1:8000/health

# 4. 챗봇 실행
python app.py
```

**접속**: http://127.0.0.1:7860

## 🌐 외부 공개 (선택사항)

`app.py` 마지막 줄에서 `share=True` 설정 시 공개 URL 생성:
```python
demo.queue().launch(server_name="0.0.0.0", server_port=7860, share=True)
```

## 🛑 서버 종료

```bash
# vLLM 서버 종료
kill $(lsof -ti :8000)
```

## 📁 파일 구성

| 파일 | 설명 |
|------|------|
| `app.py` | Gradio 웹 챗봇 |
| `test_vlm.py` | API 테스트 스크립트 |

## ⚠️ 트러블슈팅

| 문제 | 해결 방법 |
|------|-----------|
| 서버 연결 실패 | `curl http://127.0.0.1:8000/health`로 vLLM 서버 상태 확인 |
| GPU 메모리 부족 | `--tensor-parallel-size 4` 또는 `--gpu-memory-utilization 0.7` 조정 |
| 포트 충돌 | `kill $(lsof -ti :8000)` 또는 `kill $(lsof -ti :7860)` |
