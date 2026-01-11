import React, { useState } from 'react'
import ChatInterface from './components/ChatInterface'
import Sidebar from './components/Sidebar'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null); // 현재 선택된 채팅방 ID

  const handleNewChat = () => {
    setCurrentSessionId(null); // 새 채팅 모드
    // 모바일에서는 새 채팅 누르면 사이드바 닫기 (선택사항)
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }

  const handleSelectChat = (sessionId) => {
    setCurrentSessionId(sessionId);
    // 모바일에서는 채팅 선택 시 사이드바 닫기
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  }

  return (
    <div className="app">
      <Sidebar 
        onNewChat={handleNewChat} 
        onSelectChat={handleSelectChat}
        currentSessionId={currentSessionId}
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      <div className="main-content">
        <header className="app-header">
          {!isSidebarOpen && (
            <button className="menu-button" onClick={toggleSidebar} aria-label="메뉴 열기">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}
          <div className="header-branding" onClick={handleNewChat} style={{cursor: 'pointer'}}>
            <img 
                src="/assets/kut_logo.gif" 
                onError={(e) => {e.target.src = 'https://placehold.co/140x40/FF7F00/ffffff?text=SafeChat';}} 
                alt="SafeChat AI" 
                className="header-logo" 
            />
            <span className="header-divider">|</span>
            <span className="header-subtitle">Safety Management Assistant</span>
          </div>
        </header>
        <main className="app-main">
          <ChatInterface 
            sessionId={currentSessionId} 
            onSessionCreated={(id) => setCurrentSessionId(id)}
          />
        </main>
      </div>
    </div>
  )
}

export default App
