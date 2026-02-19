import React, { useEffect, useState } from 'react';
import { chatAPI, authAPI } from '../api/client';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ onNewChat, onSelectChat, currentSessionId, isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null); 
  
  // 모달 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [imgError, setImgError] = useState(false);

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
    e.stopPropagation();
    setOpenMenuSessionId(prev => prev === sessionId ? null : sessionId);
  };

  // 채팅방 이름 수정 시작
  const handleEditStart = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setNewTitle(session.title);
    setOpenMenuSessionId(null);
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

  // 채팅방 삭제 버튼 클릭
  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    setOpenMenuSessionId(null);
    setSessionToDelete(sessionId);
    setIsDeleteModalOpen(true);
  };

  // 실제 삭제 수행
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      await chatAPI.deleteSession(sessionToDelete);
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
      
      if (currentSessionId === sessionToDelete) {
        onNewChat();
      }
    } catch (error) {
      console.error("채팅방 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await authAPI.deleteAccount();
      // 삭제 애니메이션이나 효과를 위해 아주 잠깐 대기 후 로그아웃
      setTimeout(() => {
        logout();
      }, 300);
    } catch (error) {
      console.error("계정 삭제 실패:", error);
      alert("계정 삭제 중 오류가 발생했습니다.");
      setIsDeletingAccount(false);
    } finally {
      // 로그아웃으로 컴포넌트가 사라지므로 state 관리는 의미 없을 수 있지만 안전을 위해
      setIsDeleteAccountModalOpen(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]);

  return (
    <>
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-top-row">
        <div className="sidebar-logo" onClick={onNewChat} style={{cursor: 'pointer'}}>
          <img 
            src="/assets/logo_kor_v2.png" 
            onError={(e) => {e.target.src = 'https://placehold.co/120x40/183072/ffffff?text=SafeChat';}}
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
                            <button onClick={(e) => handleDeleteClick(e, session.id)} className="delete-option">
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
        <div className="user-profile-container">
          <div className="user-profile" onClick={() => setIsLogoutModalOpen(true)}>
            {!imgError ? (
              <img 
                src="/assets/profile.png" 
                onError={() => setImgError(true)} 
                alt="User" 
                className="user-avatar-img"
              />
            ) : (
              <span className="user-avatar-placeholder">👤</span>
            )}
            <div className="user-info">
              <span className="user-name">{user?.username || user?.email?.split('@')[0] || '사용자'}</span>
              <span className="logout-hint">로그아웃</span>
            </div>
          </div>
          <button 
            className="account-delete-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteAccountModalOpen(true);
            }}
          >
            탈퇴
          </button>
        </div>
      </div>
    </aside>

    <Modal
        isOpen={isDeleteModalOpen}
        title="채팅방 삭제"
        message={"이 채팅방을 삭제하시겠습니까?\n삭제된 대화는 복구할 수 없습니다."}
        confirmText="삭제"
        cancelText="취소"
        isDanger={true}
        onConfirm={confirmDeleteSession}
        onCancel={() => setIsDeleteModalOpen(false)}
    />

    <Modal
        isOpen={isLogoutModalOpen}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmText="로그아웃"
        cancelText="취소"
        isDanger={true}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
    />

    <Modal
        isOpen={isDeleteAccountModalOpen}
        title="계정 탈퇴"
        message={"정말로 계정을 삭제하시겠습니까?\n모든 채팅 기록이 영구히 삭제되며\n이 작업은 되돌릴 수 없습니다."}
        confirmText={isDeletingAccount ? "처리 중..." : "탈퇴하기"}
        cancelText="취소"
        isDanger={true}
        onConfirm={handleDeleteAccount}
        onCancel={() => !isDeletingAccount && setIsDeleteAccountModalOpen(false)}
    />
    </>
  );
};

export default Sidebar;