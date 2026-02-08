import React, { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../api/client'
import ImageUpload from './ImageUpload'
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MAX_IMAGES = 5  // 최대 이미지/파일 개수

function ChatInterface({ sessionId, onSessionCreated }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedImages, setSelectedImages] = useState([])  // 파일 배열 (이미지 + PDF)
  const [isGenerating, setIsGenerating] = useState(false) // AI 답변 생성 중
  const [isHistoryLoading, setIsHistoryLoading] = useState(false) // 대화 내역 불러오는 중
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null) // 스트리밍 취소용 컨트롤러

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // sessionId가 변경되면 해당 세션의 메시지를 불러옴
  useEffect(() => {
    const loadSession = async () => {
      // 이전 요청 취소 및 로딩 상태 초기화
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false); // 세션 변경 시 생성 상태 강제 초기화

      if (!sessionId) {
        setMessages([]); // 새 채팅이면 초기화
        return;
      }

      try {
        setIsHistoryLoading(true);
        const history = await chatAPI.getSessionMessages(sessionId);
        // 서버 응답 형식을 UI 메시지 형식으로 변환
        const formattedMessages = history.map(msg => {
          // files가 있으면 그대로 사용, 없으면 image_url로 하위 호환 처리
          let messageFiles = [];
          if (msg.files && msg.files.length > 0) {
            messageFiles = msg.files;
          } else if (msg.image_url) {
             // image_url이 JSON 문자열(새 포맷)인 경우 파싱 시도 (혹시 백엔드에서 files가 안 넘어왔을 때 대비)
             if (msg.image_url.trim().startsWith('[') && msg.image_url.trim().endsWith(']')) {
               try {
                 messageFiles = JSON.parse(msg.image_url);
               } catch (e) {
                 // 파싱 실패 시 일반 URL로 취급
                 messageFiles = [{
                   preview: msg.image_url,
                   type: msg.image_url.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ix") ? 'document' : 'image',
                   fileName: '첨부파일'
                 }];
               }
             } else {
               // 일반 URL인 경우
               messageFiles = [{
                 preview: msg.image_url,
                 type: msg.image_url.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ix") ? 'document' : 'image',
                 fileName: '첨부파일'
               }];
             }
          }

          return {
            role: msg.role,
            content: msg.content,
            files: messageFiles
          };
        });
        setMessages(formattedMessages);
      } catch (error) {
        console.error("메시지 로딩 실패:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadSession();

    // 언마운트 시 정리
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && selectedImages.length === 0) {
      return
    }

    // 파일 정보 전체 저장 (타입, 이름 포함)
    const userFiles = selectedImages.map(img => ({
      preview: img.preview,
      type: img.type,
      fileName: img.fileName
    }));

    const userMessage = {
      role: 'user',
      content: inputMessage,
      files: userFiles, // 상세 파일 정보 저장
    }

    // 사용자 메시지 추가
    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsGenerating(true)

    // 새 요청을 위한 AbortController 생성
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 이미지와 문서 분리
      const imageFiles = selectedImages.filter(item => item.type === 'image' || !item.type);
      const docFiles = selectedImages.filter(item => item.type === 'document');

      const imagesBase64 = imageFiles.map(img => img.base64)
      const documentsBase64 = docFiles.map(doc => doc.base64)
      
      // 파일 이름 목록 생성 (이미지 -> 문서 순서, 백엔드 로직과 일치시킴)
      const fileNames = [
          ...imageFiles.map(f => f.fileName || 'image.jpg'),
          ...docFiles.map(f => f.fileName || 'document.pdf')
      ];

      // 어시스턴트 메시지 플레이스홀더 추가
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      setSelectedImages([])  // 배열 초기화

      // 스트리밍 API 호출
      let fullContent = "";
      
      // client.js의 streamMessage에 signal 전달 기능이 없으므로, 
      // 현재는 로직 흐름상 비동기 처리만 중단됨. 
      // (완벽한 네트워크 취소를 위해선 client.js 수정 필요하지만, UI 상태 방어는 여기서 가능)
      
      await chatAPI.streamMessage(
        inputMessage,
        imagesBase64,
        documentsBase64,
        fileNames,
        [], // 히스토리는 서버 관리
        sessionId,
        (chunk) => {
          if (abortController.signal.aborted) return; // 취소된 요청이면 무시
          
          fullContent += chunk;
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg.role === 'assistant') {
                lastMsg.content = fullContent;
            }
            return newMsgs;
          });
        },
        (newSessionId) => {
          if (abortController.signal.aborted) return;
          if (newSessionId && newSessionId !== sessionId) {
            onSessionCreated(newSessionId);
          }
        }
      )

    } catch (error) {
      if (abortController.signal.aborted) return; // 취소된 에러는 무시
      
      console.error('메시지 전송 실패:', error)
      const errorMessage = {
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
      }
      setMessages((prev) => {
          // 마지막 메시지가 빈 어시스턴트 메시지라면 교체
          const last = prev[prev.length - 1];
          if (last.role === 'assistant' && last.content === '') {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = errorMessage;
              return newMsgs;
          }
          return [...prev, errorMessage];
      })
    } finally {
      if (!abortController.signal.aborted) {
        setIsGenerating(false)
        abortControllerRef.current = null;
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 이미지 리사이즈 함수 (긴 변 기준 1280px, JPEG 0.8)
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_SIZE = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // JPEG 포맷, 품질 0.8로 변환
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
      };
    });
  };

  // 파일 처리 핸들러 (이미지 + PDF 지원)
  const processFile = async (file) => {
    if (!file) return

    // 최대 파일 개수 체크
    if (selectedImages.length >= MAX_IMAGES) {
      alert(`파일은 최대 ${MAX_IMAGES}개까지 업로드 가능합니다.`)
      return
    }

    // 파일 크기 체크 (10MB) - PDF는 원본 유지, 이미지는 리사이즈 전 체크
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    // 파일 형식 체크
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedDocTypes = ['application/pdf']
    
    const isImage = allowedImageTypes.includes(file.type)
    const isDoc = allowedDocTypes.includes(file.type)

    if (!isImage && !isDoc) {
      alert('지원하지 않는 파일 형식입니다. (이미지 또는 PDF만 가능)')
      return
    }

    if (isImage) {
      // 이미지 리사이즈 적용
      try {
        const resizedBase64 = await resizeImage(file);
        setSelectedImages(prev => [...prev, {
          file,
          base64: resizedBase64,
          preview: resizedBase64,
          type: 'image'
        }])
      } catch (e) {
        console.error("이미지 처리 실패:", e);
        alert("이미지 처리 중 오류가 발생했습니다.");
      }
    } else {
      // PDF 처리
      const reader = new FileReader()
      reader.onloadend = () => {
        // PDF 아이콘 (단순한 붉은색 사각형에 PDF 텍스트가 있는 PNG Base64)
        const pdfIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAAbklEQVRoge3ZwQmAAAyE4Qwn13I8W7iCF7GwvzmCiO/lQA558CCwS+p2u6quZ+Y+576vMzP3/d77zKwFj2OOOY455jjmmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOaY5H6wCDZ4w3gqqAAAAAElFTkSuQmCC";

        setSelectedImages(prev => [...prev, {
          file,
          base64: reader.result,
          preview: pdfIcon, // UI 표시용 아이콘
          type: 'document',
          fileName: file.name // 파일명 저장
        }])
      }
      reader.readAsDataURL(file)
    }
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
      if (item.type.startsWith('image/') || item.type === 'application/pdf') {
        e.preventDefault()
        const file = item.getAsFile()
        processFile(file)
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
    if (file) {
      processFile(file)
    }
  }

  return (
    <div className="chat-interface" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>이미지 또는 PDF 문서와 함께 질문을 입력하세요</p>
            <p className="hint">예: "이 문서의 내용을 요약해줘" 또는 "이 이미지의 위험요소는?"</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className={`message-content ${msg.role === 'assistant' ? 'markdown-body' : ''}`}>
              {/* 새 방식: files 배열 사용 */}
              {msg.files && msg.files.length > 0 && (
                <div className="message-images">
                  {msg.files.map((file, fileIndex) => {
                    if (!file) return null;
                    
                    // 타입이 명시되어 있으면 그것을 따름, 없으면 미리보기 URL로 추론
                    const isPdf = file.type === 'document' || 
                                 (typeof file.preview === 'string' && file.preview.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ix"));
                    
                    if (isPdf) {
                        return (
                            <div key={fileIndex} className="pdf-card">
                                <div className="pdf-icon">PDF</div>
                                <span className="pdf-label">{file.fileName || '문서 파일'}</span>
                            </div>
                        );
                    }
                    
                    // 이미지인 경우
                    return (
                        <img
                          key={fileIndex}
                          src={file.preview || file.url} // url 속성도 체크
                          alt={`uploaded-${fileIndex}`}
                          className="message-image"
                          onError={(e) => {e.target.style.display = 'none'}} // 로드 실패 시 숨김
                        />
                    );
                  })}
                </div>
              )}
              {/* 구 방식 호환성 (files가 없을 때 images 사용) */}
              {(!msg.files || msg.files.length === 0) && msg.images && msg.images.length > 0 && (
                <div className="message-images">
                  {msg.images.map((imgSrc, imgIndex) => {
                    if (!imgSrc) return null;
                    
                    const isPdf = typeof imgSrc === 'string' && imgSrc.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ix");
                    if (isPdf) {
                        return (
                            <div key={imgIndex} className="pdf-card">
                                <div className="pdf-icon">PDF</div>
                                <span className="pdf-label">문서 파일</span>
                            </div>
                        );
                    }
                    return (
                        <img
                          key={imgIndex}
                          src={imgSrc}
                          alt={`uploaded-${imgIndex}`}
                          className="message-image"
                        />
                    );
                  })}
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
        {isGenerating && (
          <div className="message assistant">
            <div className="thinking-container">
              {/* 생각중 이미지 */}
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
            placeholder={isHistoryLoading ? "대화 내용을 불러오는 중입니다..." : "메시지를 입력하세요... (Shift+Enter로 줄바꿈)"}
            className="chat-input"
            rows="3"
            disabled={isGenerating || isHistoryLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isGenerating || isHistoryLoading || (!inputMessage.trim() && selectedImages.length === 0)}
            className="send-button"
          >
            {isGenerating ? '전송 중...' : '보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface