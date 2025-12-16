import gradio as gr
from openai import OpenAI
import base64
from pathlib import Path
import shutil
import os

client = OpenAI(base_url="http://127.0.0.1:8000/v1", api_key="EMPTY")
MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"

# 이미지를 영구 저장할 디렉토리
UPLOAD_DIR = Path("/tmp/chatbot_images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_image_permanently(image_path):
    """이미지를 영구 저장 디렉토리에 복사"""
    if image_path and Path(image_path).exists():
        filename = Path(image_path).name
        # 고유한 파일명 생성
        import uuid
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        dest_path = UPLOAD_DIR / unique_name
        shutil.copy2(image_path, dest_path)
        return str(dest_path)
    return None

def encode_image_to_base64(image_path):
    """이미지를 base64로 인코딩"""
    if image_path and Path(image_path).exists():
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return None

def chat_fn(message, image, image_history):
    """
    image_history: 이전 대화에서 사용된 이미지 경로 리스트
    """
    contents = []
    current_image_path = None
    
    if message:
        contents.append({"type": "text", "text": message})
    
    if image is not None:
        if isinstance(image, str) and Path(image).exists():
            # 이미지를 영구 저장
            current_image_path = save_image_permanently(image)
            b64 = encode_image_to_base64(current_image_path)
            if b64:
                contents.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                })

    messages = []
    
    # image_history에서 이전 대화 내용을 복원
    # image_history 형식: [(user_text, assistant_text, image_path), ...]
    if image_history:
        for item in image_history:
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                user_text = item[0]
                assistant_text = item[1]
                img_path = item[2] if len(item) > 2 else None
                
                # 사용자 메시지 처리
                user_content = []
                if user_text:
                    user_content.append({"type": "text", "text": user_text})
                if img_path and Path(img_path).exists():
                    b64 = encode_image_to_base64(img_path)
                    if b64:
                        user_content.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                        })
                
                if user_content:
                    messages.append({"role": "user", "content": user_content})
                
                # 어시스턴트 메시지 처리
                if assistant_text:
                    messages.append({
                        "role": "assistant",
                        "content": [{"type": "text", "text": assistant_text}]
                    })

    # 현재 메시지 추가
    if contents:
        messages.append({"role": "user", "content": contents})

    resp = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.2
    )
    return resp.choices[0].message.content, current_image_path

with gr.Blocks(fill_height=True) as demo:
    gr.Markdown("## 사내용 멀티모달 챗봇 (vLLM + Qwen2.5-VL)")
    
    # 이미지 경로를 저장하는 State (대화 기록 유지용)
    # 형식: [(user_text, assistant_text, image_path), ...]
    image_history = gr.State([])
    
    chatbot = gr.Chatbot(height=520, sanitize_html=False)
    with gr.Row():
        txt = gr.Textbox(label="메시지", scale=4,
                         placeholder="이미지와 함께 질문을 입력하세요. (예: 한글로 설명해줘)")
        img = gr.Image(label="이미지 업로드", type="filepath", scale=1)
    send = gr.Button("보내기", variant="primary")

    def ui_submit(message, image, chat_history, img_history):
        ans, saved_image_path = chat_fn(message, image, img_history)
        if ans is None:
            ans = ""
        
        # Gradio Chatbot messages 형식 사용
        # 형식: [{"role": "user", "content": ...}, {"role": "assistant", "content": ...}, ...]
        if not chat_history:
            chat_history = []
        if not img_history:
            img_history = []
        
        # 기존 대화 기록 유지
        new_history = list(chat_history)
        new_img_history = list(img_history)
        
        # 새 메시지 추가 - messages 형식 사용
        if saved_image_path:
            # 이미지가 있는 경우: HTML로 이미지를 직접 표시
            # base64로 인코딩하여 HTML img 태그로 표시
            b64 = encode_image_to_base64(saved_image_path)
            img_html = f'<img src="data:image/png;base64,{b64}" style="max-width:400px; max-height:300px; border-radius:8px;">'
            user_msg = f"{message}\n\n{img_html}" if message else img_html
            new_history.append({"role": "user", "content": user_msg})
            # 이미지 경로를 별도로 저장 (대화 기록 유지용)
            new_img_history.append((message if message else "", ans, saved_image_path))
        else:
            # 이미지가 없는 경우: 텍스트만
            if message:
                new_history.append({"role": "user", "content": message})
            new_img_history.append((message if message else "", ans, None))
        
        if ans:
            new_history.append({"role": "assistant", "content": ans})
        
        return "", None, new_history, new_img_history

    send.click(
        ui_submit, 
        inputs=[txt, img, chatbot, image_history], 
        outputs=[txt, img, chatbot, image_history]
    )

if __name__ == "__main__":
    # demo.queue().launch(server_name="127.0.0.1", server_port=7860)
    demo.queue().launch(server_name="0.0.0.0", server_port=7860, share=True) # 링크 배포
