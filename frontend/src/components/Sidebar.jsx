import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI, authAPI } from '../api/client';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';

const formatDate = (dateString) => {
  if (!dateString) return '';

  let normalizedDate = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    normalizedDate = dateString.replace(' ', 'T') + 'Z';
  }

  const date = new Date(normalizedDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays === 1) return '어제';
  if (diffInDays < 7) return `${diffInDays}일 전`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

const Sidebar = ({ 
  onNewChat, 
  onSelectChat, 
  currentSessionId, 
  isOpen, 
  toggleSidebar,
  // 관리자 전용 props
  isAdminView = false,
  users = [],
  selectedUserId = null,
  onUserSelect = () => {},
  onDeleteUser = () => {},
  loadingUsers = false,
  // 신고 관련 props
  activeView = 'users', // 'users' or 'reports'
  onViewChange = () => {},
  reports = [],
  selectedReportId = null,
  onReportSelect = () => {},
  onDeleteReport = () => {},
  loadingReports = false
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null); 
  
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState("");

  // 뷰 변경 시 검색어 초기화
  useEffect(() => {
    setSearchQuery("");
  }, [activeView]);

  // 모달 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [imgError, setImgError] = useState(false);

  // 채팅방 목록 불러오기 (일반 사용자용)
  const fetchSessions = async () => {
    if (user?.is_admin) return;
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
    if (!user?.is_admin) {
      fetchSessions();
    }
  }, [currentSessionId, user]);

  return (
    <>
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-top-row">
        <div className="sidebar-logo" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
          <img 
            src="/assets/logo_kor_v2.png" 
            onError={(e) => {e.target.src = 'https://placehold.co/120x40/183072/ffffff?text=SafeChat';}}
            alt="App Logo" 
            className="logo-img"
          />
        </div>
        {!isAdminView && (
          <button className="sidebar-toggle-btn" onClick={toggleSidebar} aria-label="메뉴 닫기">
            ☰
          </button>
        )}
      </div>
      <div className="sidebar-header">
        {!user?.is_admin && (
          <button className="new-chat-btn" onClick={onNewChat}>
            <span className="plus-icon">+</span>
            <span className="btn-text">새로운 채팅</span>
          </button>
        )}
        {user?.is_admin && (
          <div className="admin-nav" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="admin-dashboard-btn" 
              onClick={() => {
                navigate('/admin');
                onViewChange('users');
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: (isAdminView && activeView === 'users') ? '1px solid #FF7F00' : 'none',
                backgroundColor: (isAdminView && activeView === 'users') ? 'rgba(255, 127, 0, 0.1)' : '#183072',
                color: (isAdminView && activeView === 'users') ? '#FF7F00' : 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {isAdminView && activeView === 'users' ? '📊 사용자 현황' : '⚙️ 사용자 관리'}
            </button>
            <button 
              className="admin-dashboard-btn" 
              onClick={() => {
                navigate('/admin');
                onViewChange('reports');
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: (isAdminView && activeView === 'reports') ? '1px solid #FF3B30' : 'none',
                backgroundColor: (isAdminView && activeView === 'reports') ? 'rgba(255, 59, 48, 0.1)' : '#183072',
                color: (isAdminView && activeView === 'reports') ? '#FF3B30' : 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {isAdminView && activeView === 'reports' ? '🚨 신고 현황' : '📢 신고 관리'}
            </button>
          </div>
        )}
      </div>
      
      <div className="sidebar-content">
        {/* 관리자 검색바 (사용자/신고 관리 시에만 표시) */}
        {isAdminView && (
          <div className="admin-search-container" style={{ padding: '0 10px 10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={activeView === 'users' ? "사용자 검색..." : "신고자 검색..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: '10px',
                  border: '1px solid #d2d2d7',
                  fontSize: '13px',
                  backgroundColor: 'white',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }}>🔍</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#86868b', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {!user?.is_admin && (
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
        )}
        {user?.is_admin && isAdminView && activeView === 'users' && (
          <div className="history-section">
            <h3 className="history-label">사용자 관리 ({users.length})</h3>
            <div className="history-list">
              {loadingUsers ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#86868b' }}>로딩 중...</div>
              ) : (
                users
                  .filter(u => 
                    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((u) => (
                    <div 
                      key={u.id} 
                    className={`history-item ${selectedUserId === u.id ? 'active' : ''}`}
                    onClick={() => onUserSelect(u.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <span className="chat-title" style={{ fontWeight: 600 }}>{u.username}</span>
                      <span style={{ fontSize: '11px', color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                    </div>
                    {u.id !== user?.id && (
                      <button 
                        className="options-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteUser(u.id);
                        }}
                        style={{ color: '#FF3B30', opacity: 1 }}
                        title="사용자 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {user?.is_admin && isAdminView && activeView === 'reports' && (
          <div className="history-section">
            <h3 className="history-label">신고 내역 ({reports.length})</h3>
            <div className="history-list">
              {loadingReports ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#86868b' }}>로딩 중...</div>
              ) : (
                reports
                  .filter(r => r.username?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((r) => (
                    <div 
                      key={r.user_id} 
                    className={`history-item ${selectedReportId === r.user_id ? 'active' : ''}`}
                    onClick={() => onReportSelect(r.user_id)}
                    style={{ cursor: 'pointer', borderLeft: selectedReportId === r.user_id ? '4px solid #FF3B30' : 'none' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="chat-title" style={{ fontWeight: 600, color: '#FF3B30' }}>
                          🚨 {r.username}
                        </span>
                        {r.pending_count > 0 && (
                          <span style={{ 
                            fontSize: '9px', background: '#FF3B30', color: 'white', 
                            padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' 
                          }}>
                            {r.pending_count}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#86868b' }}>
                        신고 {r.total_report_count}건 / {formatDate(r.latest_report_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {user?.is_admin && isAdminView && activeView === 'chats' && (
          <div className="admin-sidebar-info" style={{ padding: '20px', color: '#86868b', fontSize: '13px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔍</div>
            전체 대화 검색 모드입니다.<br/><br/>
            중간 열의 검색창을 통해 제목이나 대화 내용에 포함된 키워드로 모든 사용자의 대화를 검색할 수 있습니다.
          </div>
        )}
        {user?.is_admin && !isAdminView && (
          <div className="admin-sidebar-info" style={{ padding: '20px', color: '#86868b', fontSize: '13px', textAlign: 'center' }}>
            관리자 모드에서는 대화 기능을 사용할 수 없으며, 사용자 관리 및 로그 확인만 가능합니다.
          </div>
        )}
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
              {!user?.is_admin && <span className="logout-hint">로그아웃</span>}
            </div>
          </div>
          <button 
            className="account-delete-btn" 
            onClick={(e) => {
              e.stopPropagation();
              if (user?.is_admin) {
                setIsLogoutModalOpen(true);
              } else {
                setIsDeleteAccountModalOpen(true);
              }
            }}
          >
            {user?.is_admin ? "로그아웃" : "탈퇴"}
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