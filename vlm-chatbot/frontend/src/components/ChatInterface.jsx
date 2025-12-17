import React, { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../api/client'
import ImageUpload from './ImageUpload'
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) {
      return
    }

    const userMessage = {
      role: 'user',
      content: inputMessage,
      image: selectedImage?.preview,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // 히스토리 구성
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await chatAPI.sendMessage(
        inputMessage,
        selectedImage?.base64,
        history
      )

      const assistantMessage = {
        role: 'assistant',
        content: response.response,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setSelectedImage(null)
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

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>이미지와 함께 질문을 입력하세요</p>
            <p className="hint">예: "이 이미지에서 위험요소를 찾아줘"</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.image && (
                <img
                  src={msg.image}
                  alt="uploaded"
                  className="message-image"
                />
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    return <code className={className} {...props}>{children}</code>
                  },
                }}
              > 
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <ImageUpload
          selectedImage={selectedImage}
          onImageSelect={setSelectedImage}
        />

        <div className="input-row">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            className="chat-input"
            rows="3"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
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
