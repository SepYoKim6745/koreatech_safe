import React, { useEffect, useState } from 'react';
import { chatAPI } from '../api/client';

const Sidebar = ({ onNewChat, onSelectChat, currentSessionId, isOpen, toggleSidebar }) => {
  const [sessions, setSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null); // 현재 열린 메뉴 ID

  // 채팅방 목록 불러오기
  const fetchSessions = async () => {
    try {
      const data = await chatAPI.getSessions();
      setSessions(data);
    } catch (error) {
      console.error("채팅 목록 로딩 실패:", error);
    }
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuSessionId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 메뉴 토글
  const handleToggleMenu = (e, sessionId) => {
    e.stopPropagation(); // 상위 클릭 이벤트 전파 방지
    setOpenMenuSessionId(prev => prev === sessionId ? null : sessionId);
  };

  // 채팅방 이름 수정 시작
  const handleEditStart = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setNewTitle(session.title);
    setOpenMenuSessionId(null); // 메뉴 닫기
  };

  // 채팅방 이름 저장
  const handleRenameSession = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!newTitle.trim()) {
        setEditingSessionId(null);
        return;
    }

    try {
      await chatAPI.updateSessionTitle(editingSessionId, newTitle);
      
      setSessions(prev => prev.map(s => 
        s.id === editingSessionId ? { ...s, title: newTitle } : s
      ));
      
      setEditingSessionId(null);
    } catch (error) {
      console.error("이름 수정 실패:", error);
      alert("이름 수정 중 오류가 발생했습니다.");
    }
  };

  // 채팅방 삭제
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    setOpenMenuSessionId(null); // 메뉴 닫기
    
    if (!window.confirm("이 채팅방을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await chatAPI.deleteSession(sessionId);
      
      // 목록에서 제거
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // 현재 열려있는 채팅방이면 초기화
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error("채팅방 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-top-row">
        <div className="sidebar-logo">
          {/* 추후 로고 이미지로 교체 예정 */}
          <img 
            src="https://placehold.co/120x40/333/FFF?text=SafeChat" 
            alt="App Logo" 
            className="logo-img"
          />
        </div>
        <button className="sidebar-toggle-btn" onClick={toggleSidebar} aria-label="메뉴 닫기">
          ☰
        </button>
      </div>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewChat}>
          <span className="plus-icon">+</span>
          <span className="btn-text">새로운 채팅</span>
        </button>
      </div>
      
      <div className="sidebar-content">
        <div className="history-section">
          <h3 className="history-label">최근 활동</h3>
          <ul className="history-list">
            {sessions.map((session) => (
              <li 
                key={session.id} 
                className={`history-item ${currentSessionId === session.id ? 'active' : ''}`}
                onClick={() => onSelectChat(session.id)}
              >
                <span className="chat-icon">💬</span>
                
                {editingSessionId === session.id ? (
                  <form onSubmit={handleRenameSession} className="rename-form" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onBlur={() => setEditingSessionId(null)}
                      autoFocus
                      className="rename-input"
                    />
                  </form>
                ) : (
                  <span className="chat-title" onDoubleClick={(e) => handleEditStart(e, session)}>
                    {session.title}
                  </span>
                )}
                
                <div className="menu-container">
                    <button 
                        className={`options-btn ${openMenuSessionId === session.id ? 'visible' : ''}`}
                        onClick={(e) => handleToggleMenu(e, session.id)}
                        title="옵션"
                    >
                        ⋮
                    </button>
                    
                    {openMenuSessionId === session.id && (
                        <div className="options-dropdown">
                            <button onClick={(e) => handleEditStart(e, session)}>
                                ✏️ 이름 변경
                            </button>
                            <button onClick={(e) => handleDeleteSession(e, session.id)} className="delete-option">
                                🗑️ 삭제
                            </button>
                        </div>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">👤</div>
          <span className="user-name">사용자</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
