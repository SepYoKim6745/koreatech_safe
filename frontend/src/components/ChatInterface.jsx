import React, { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../api/client'
import ImageUpload from './ImageUpload'
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
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
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // sessionId가 변경되면 해당 세션의 메시지를 불러옴
  useEffect(() => {
    const loadSession = async () => {
      if (isGeneratingRef.current && sessionId) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      setIsGenerating(false); 

      if (!sessionId) {
        setMessages([]); 
        return;
      }

      try {
        setIsHistoryLoading(true);
        const history = await chatAPI.getSessionMessages(sessionId);
        const formattedMessages = history.map(msg => {
          let messageFiles = [];
          if (msg.files && msg.files.length > 0) {
            messageFiles = msg.files;
          } else if (msg.image_url) {
             if (msg.image_url.trim().startsWith('[') && msg.image_url.trim().endsWith(']')) {
               try {
                 messageFiles = JSON.parse(msg.image_url);
               } catch (e) {
                 messageFiles = [{
                   preview: msg.image_url,
                   type: msg.image_url.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ix") ? 'document' : 'image',
                   fileName: '첨부파일'
                 }];
               }
             } else {
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

    return () => {
      if (!isGeneratingRef.current && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom()
  }, [messages, isGenerating])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && selectedImages.length === 0) {
      return
    }

    const userFiles = selectedImages.map(img => ({
      preview: img.preview,
      type: img.type,
      fileName: img.fileName
    }));

    const userMessage = {
      role: 'user',
      content: inputMessage,
      files: userFiles,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsGenerating(true)

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const imageFiles = selectedImages.filter(item => item.type === 'image' || !item.type);
      const docFiles = selectedImages.filter(item => item.type === 'document');

      const imagesBase64 = imageFiles.map(img => img.base64)
      const documentsBase64 = docFiles.map(doc => doc.base64)
      
      const fileNames = [
          ...imageFiles.map(f => f.fileName || 'image.jpg'),
          ...docFiles.map(f => f.fileName || 'document.pdf')
      ];

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      setSelectedImages([])

      let fullContent = "";
      let lastUpdateTime = 0;
      let pendingUpdate = null;
      
      await chatAPI.streamMessage(
        inputMessage,
        imagesBase64,
        documentsBase64,
        fileNames,
        [], 
        sessionId,
        (chunk) => {
          if (abortController.signal.aborted) return; 
          
          fullContent += chunk;
          const now = Date.now();
          
          if (now - lastUpdateTime > 100) {
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = fullContent;
                }
                return newMsgs;
              });
              lastUpdateTime = now;
          } else {
              if (pendingUpdate) clearTimeout(pendingUpdate);
              pendingUpdate = setTimeout(() => {
                  if (abortController.signal.aborted) return;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        lastMsg.content = fullContent;
                    }
                    return newMsgs;
                  });
                  lastUpdateTime = Date.now();
              }, 100);
          }
        },
        (newSessionId) => {
          if (abortController.signal.aborted) return;
          if (newSessionId && newSessionId !== sessionId) {
            onSessionCreated(newSessionId);
          }
        },
        abortController.signal
      )
      
      if (pendingUpdate) clearTimeout(pendingUpdate);
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = fullContent;
        }
        return newMsgs;
      });

    } catch (error) {
      if (abortController.signal.aborted) return;
      
      console.error('메시지 전송 실패:', error)
      const errorMessage = {
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
      }
      setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.content === '') {
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
      };
    });
  };

  const processFile = async (file) => {
    if (!file) return
    if (selectedImages.length >= MAX_IMAGES) {
      alert(`파일은 최대 ${MAX_IMAGES}개까지 업로드 가능합니다.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedDocTypes = ['application/pdf']
    const isImage = allowedImageTypes.includes(file.type)
    const isDoc = allowedDocTypes.includes(file.type)
    if (!isImage && !isDoc) {
      alert('지원하지 않는 파일 형식입니다. (이미지 또는 PDF만 가능)')
      return
    }
    if (isImage) {
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
      const reader = new FileReader()
      reader.onloadend = () => {
        const pdfIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAAbklEQVRoge3ZwQmAAAyE4Qwn13I8W7iCF7GwvzmCiO/lQA558CCwS+p2u6quZ+Y+576vMzP3/d77zKwFj2OOOY455jjmmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOeY45pjjmOOYY45jjjmOOaY5H6wCDZ4w3gqqAAAAAElFTkSuQmCC";
        setSelectedImages(prev => [...prev, {
          file,
          base64: reader.result,
          preview: pdfIcon,
          type: 'document',
          fileName: file.name
        }])
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

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

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

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

        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          const showThinking = isGenerating && isLastMessage && msg.role === 'assistant';

          return (
            <div key={index} className={`message ${msg.role}`}>
              <div className={`message-content ${msg.role === 'assistant' ? 'markdown-body' : ''}`}>
                {/* 생각중 애니메이션을 어시스턴트 메시지 상단에 배치 */}
                {showThinking && (
                  <div className="thinking-container">
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
                )}

                {msg.files && msg.files.length > 0 && (
                  <div className="message-images">
                    {msg.files.map((file, fileIndex) => {
                      if (!file) return null;
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
                      return (
                          <img
                            key={fileIndex}
                            src={file.preview || file.url}
                            alt={`uploaded-${fileIndex}`}
                            className="message-image"
                            onError={(e) => {e.target.style.display = 'none'}}
                          />
                      );
                    })}
                  </div>
                )}
                
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw]}
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
                    table({children}) {
                      return <table className="chat-table">{children}</table>
                    }
                  }}
                > 
                  {msg.content || ''}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
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