import React, { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../api/client'
import ImageUpload from './ImageUpload'
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MAX_IMAGES = 5  // 최대 이미지 개수

function ChatInterface({ sessionId, onSessionCreated }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedImages, setSelectedImages] = useState([])  // 배열로 변경
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // sessionId가 변경되면 해당 세션의 메시지를 불러옴
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setMessages([]); // 새 채팅이면 초기화
        return;
      }

      try {
        setIsLoading(true);
        const history = await chatAPI.getSessionMessages(sessionId);
        // 서버 응답 형식을 UI 메시지 형식으로 변환
        const formattedMessages = history.map(msg => ({
          role: msg.role,
          content: msg.content,
          images: msg.image_url ? [msg.image_url] : [] // 이미지가 있다면 (현재는 1개만 가정)
        }));
        setMessages(formattedMessages);
      } catch (error) {
        console.error("메시지 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && selectedImages.length === 0) {
      return
    }

    const userMessage = {
      role: 'user',
      content: inputMessage,
      images: selectedImages.map(img => img.preview),  // 배열로 변경
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // 이미지 배열 전송 (없으면 null)
      const imagesBase64 = selectedImages.length > 0 
        ? selectedImages.map(img => img.base64) 
        : null

      // API 호출 (sessionId 전달)
      const response = await chatAPI.sendMessage(
        inputMessage,
        imagesBase64,
        [], // 히스토리는 이제 서버에서 관리하므로 빈 배열 전송 (혹은 필요시 클라이언트 state 전송)
        sessionId
      )

      // 새 세션이 생성되었다면 부모에게 알림
      if (response.session_id && response.session_id !== sessionId) {
        onSessionCreated(response.session_id);
      }

      const assistantMessage = {
        role: 'assistant',
        content: response.response,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setSelectedImages([])  // 배열 초기화
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      const errorMessage = {
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 이미지 파일 처리 핸들러 (다중 이미지 지원)
  const processImageFile = (file) => {
    if (!file) return

    // 최대 이미지 개수 체크
    if (selectedImages.length >= MAX_IMAGES) {
      alert(`이미지는 최대 ${MAX_IMAGES}개까지 업로드 가능합니다.`)
      return
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    // 파일 형식 체크
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('지원하지 않는 파일 형식입니다. (jpg, png, gif, webp만 가능)')
      return
    }

    // 파일을 base64로 변환
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImages(prev => [...prev, {  // 배열에 추가
        file,
        base64: reader.result,
        preview: reader.result,
      }])
    }
    reader.readAsDataURL(file)
  }

  // 이미지 삭제 핸들러
  const handleRemoveImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  // 클립보드 붙여넣기 핸들러 (Ctrl+V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        processImageFile(file)
        break
      }
    }
  }

  // 드래그 오버 핸들러 (드롭을 허용하기 위해 필수)
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) {
      processImageFile(file)
    }
  }

  return (
    <div className="chat-interface" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>이미지와 함께 질문을 입력하세요</p>
            <p className="hint">예: "이 이미지에서 위험요소를 찾아줘"</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className={`message-content ${msg.role === 'assistant' ? 'markdown-body' : ''}`}>
              {msg.images && msg.images.length > 0 && (
                <div className="message-images">
                  {msg.images.map((imgSrc, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={imgSrc}
                      alt={`uploaded-${imgIndex}`}
                      className="message-image"
                    />
                  ))}
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                  // 테이블 스타일링을 위한 커스텀 컴포넌트 추가 가능
                  table({children}) {
                    return <table className="chat-table">{children}</table>
                  }
                }}
              > 
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="thinking-container">
              {/* 생각중 이미지 (추후 교체 예정) */}
              <img 
                src="../public/assets/thinking.gif" 
                alt="Thinking" 
                className="thinking-image"
              />
              <div className="thinking-text">
                <span>생각중</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div 
        className="chat-input-container"
      >
        <ImageUpload
          selectedImages={selectedImages}
          onRemoveImage={handleRemoveImage}
          maxImages={MAX_IMAGES}
        />

        <div className="input-row">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            className="chat-input"
            rows="3"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && selectedImages.length === 0)}
            className="send-button"
          >
            {isLoading ? '전송 중...' : '보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
