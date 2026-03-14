import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import Lightbox from '../components/Lightbox';
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/Admin.css';

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // 백엔드에서 오는 시간(UTC)을 브라우저가 정확히 인식하도록 'Z' 접미사 확인 및 추가
  let normalizedDate = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    // T가 없고 공백이 있는 경우 T로 교체 (ISO 표준 준수)
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

  // 1주일 이상이면 절대 날짜 표시
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userChats, setUserChats] = useState([]);
  const [selectedChatMessages, setSelectedChatMessages] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 대시보드 뷰 상태
  const [activeView, setActiveView] = useState('users'); // 'users' or 'reports'
  
  // 신고 관련 상태
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // 채팅방 검색어 상태
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  // 모달 상태 관리
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [isDeleteReportModalOpen, setIsDeleteReportModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);

  // 알림 모달 상태 (alert() 대체용)
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "" });

  // 입력 필드 상태
  const [newPassword, setNewPassword] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // 라이트박스 상태
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // 대화 상세가 바뀔 때마다 하단으로 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChatMessages]);

  // 초기 데이터 로드 (사용자 목록) 및 권한 체크
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchReports();
  }, [user]);

  // 선택 변경 시 채팅 검색어 초기화 및 초기 데이터 로드
  useEffect(() => {
    setChatSearchQuery("");
    
    // 사용자 관리 모드에서 아무도 선택하지 않았을 때 -> 전체 채팅 목록 로드 (검색 가능하게)
    if (activeView === 'users' && !selectedUserId) {
        fetchGlobalChats();
    }
  }, [selectedUserId, selectedReportId, activeView]);

  // 전체 검색 모드(아무도 선택 안 함)에서 검색어 변경 시 실시간 서버 검색
  useEffect(() => {
    if (activeView === 'users' && !selectedUserId) {
        const timer = setTimeout(() => {
            fetchGlobalChats(chatSearchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [chatSearchQuery, activeView, selectedUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listUsers();
      setUsers(data);
    } catch (err) {
      setError('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const data = await adminAPI.listReports();
      // 최신 활동 순으로 정렬
      const sortedData = data.sort((a, b) => new Date(b.latest_report_at) - new Date(a.latest_report_at));
      setReports(sortedData);
    } catch (err) {
      console.error('신고 내역 로딩 실패:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchGlobalChats = async (keyword = "") => {
    setChatsLoading(true);
    try {
      const data = await adminAPI.listAllChats(keyword);
      setUserChats(data);
    } catch (err) {
      console.error('전체 채팅 로딩 실패:', err);
    } finally {
      setChatsLoading(false);
    }
  };

  const formatMessages = (messages) => {
    return messages.map(msg => {
      let messageFiles = [];
      if (msg.files && msg.files.length > 0) {
        messageFiles = msg.files;
      } else if (msg.image_url) {
         const trimmedUrl = msg.image_url.trim();
         if (trimmedUrl.startsWith('[') && trimmedUrl.endsWith(']')) {
           try {
             messageFiles = JSON.parse(trimmedUrl);
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
      return { ...msg, files: messageFiles };
    });
  };

  // 사용자를 클릭/선택했을 때 해당 사용자의 채팅 목록 로드
  const handleUserSelect = async (userId) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      setUserChats([]);
      setSelectedChatMessages(null);
      return;
    }

    setSelectedUserId(userId);
    setSelectedReportId(null); // 신고 선택 해제
    setSelectedChatMessages(null);
    setUserChats([]); // 이전 채팅 목록 초기화
    setChatsLoading(true);
    try {
      const chats = await adminAPI.listUserChats(userId);
      setUserChats(chats);
    } catch (err) {
      console.error('채팅 목록 로드 에러:', err);
      alert('채팅 목록을 불러오는데 실패했습니다. (세션 만료일 수 있으니 다시 로그인해보세요)');
    } finally {
      setChatsLoading(false);
    }
  };

  // 신고 관리에서 사용자를 클릭했을 때 해당 사용자의 '신고된 채팅방들'만 로드
  const handleReportSelect = async (userId) => {
    const numUserId = Number(userId);
    if (selectedReportId === numUserId) {
      setSelectedReportId(null);
      setSelectedChatMessages(null);
      setUserChats([]);
      return;
    }

    setSelectedReportId(numUserId);
    setSelectedUserId(null); // 사용자 관리 선택 해제
    
    const reportGroup = reports.find(r => Number(r.user_id) === numUserId);
    if (!reportGroup) return;

    setChatsLoading(true);
    try {
      // 1. 해당 사용자의 전체 채팅 목록을 가져옴
      const allChats = await adminAPI.listUserChats(numUserId);
      // 2. 그 중 신고가 발생한 세션 ID 목록에 포함된 채팅만 필터링
      const reportedSessions = allChats.filter(c => reportGroup.reported_session_ids.includes(c.id));
      setUserChats(reportedSessions);
      setSelectedChatMessages(null); // 초기에는 메시지 비움 (목록에서 선택해야 함)
    } catch (err) {
      alert('신고된 목록을 불러오는데 실패했습니다.');
    } finally {
      setChatsLoading(false);
    }
  };

  const handleViewChat = async (sessionId) => {
    try {
      const messages = await adminAPI.getChatMessages(sessionId);
      const formattedMessages = formatMessages(messages);
      
      // 신고 뷰일 경우 해당 세션의 신고 상세 정보를 가져와서 매핑
      if (activeView === 'reports' && selectedReportId) {
          try {
              const details = await adminAPI.getReportDetails(sessionId, selectedReportId);
              setSelectedChatMessages({ 
                  id: sessionId, 
                  messages: formattedMessages,
                  reportReasons: details.reasons,
                  reportedMessageIds: details.reported_message_ids
              });
          } catch (e) {
              // 신고가 없는 일반 채팅 클릭 시 (필터링했지만 혹시 모를 상황 대비)
              setSelectedChatMessages({ id: sessionId, messages: formattedMessages });
          }
      } else {
          setSelectedChatMessages({ id: sessionId, messages: formattedMessages });
      }
    } catch (err) {
      alert('채팅 내용을 불러오는데 실패했습니다.');
    }
  };

  // 실제 동작 함수들
  const confirmDeleteUser = async () => {
    try {
      await adminAPI.deleteUser(targetId);
      setUsers(users.filter(u => u.id !== targetId));
      if (selectedUserId === targetId) {
        setSelectedUserId(null);
        setUserChats([]);
        setSelectedChatMessages(null);
      }
    } catch (err) {
      alert('삭제 실패');
    } finally {
      setIsDeleteUserModalOpen(false);
      setTargetId(null);
    }
  };

  const confirmDeleteChat = async () => {
    try {
      await adminAPI.deleteChat(targetId);
      setUserChats(userChats.filter(c => c.id !== targetId));
      if (selectedChatMessages?.id === targetId) {
        setSelectedChatMessages(null);
      }
    } catch (err) {
      alert('채팅 삭제 실패');
    } finally {
      setIsDeleteChatModalOpen(false);
      setTargetId(null);
    }
  };

  const confirmDeleteReport = async () => {
    try {
      const [userId, sessionId] = targetId.split('-').map(Number);
      await adminAPI.deleteSessionReports(sessionId, userId);
      
      // 신고 목록에서 해당 세션 정보 제거 및 전체 신고 수 업데이트
      setReports(prev => {
          const newReports = [...prev];
          const userIdx = newReports.findIndex(r => r.user_id === userId);
          if (userIdx !== -1) {
              const updatedSessionIds = newReports[userIdx].reported_session_ids.filter(id => id !== sessionId);
              if (updatedSessionIds.length === 0) {
                  // 더 이상 이 유저의 신고가 없으면 리스트에서 삭제
                  return newReports.filter(r => r.user_id !== userId);
              } else {
                  // 남은 신고 세션이 있으면 업데이트
                  newReports[userIdx].reported_session_ids = updatedSessionIds;
                  // (참고: 정확한 total_report_count 갱신은 백엔드 다시 불러오는게 가장 정확하지만 일단 프론트에서 간소화)
              }
          }
          return newReports;
      });

      // 현재 보고 있는 세션이 삭제된 경우 화면 갱신
      if (selectedChatMessages?.id === sessionId) {
          setSelectedChatMessages(null);
          setUserChats(prev => prev.filter(c => c.id !== sessionId));
      }

      // 만약 해당 유저의 모든 신고가 사라졌다면 사이드바 선택 해제
      const checkUser = reports.find(r => r.user_id === userId);
      if (checkUser && checkUser.reported_session_ids.length <= 1 && checkUser.reported_session_ids.includes(sessionId)) {
          setSelectedReportId(null);
          setUserChats([]);
      }
      
      // 상태 최신화를 위해 신고 목록 다시 불러오기
      fetchReports();

    } catch (err) {
      alert('신고 삭제 실패');
    } finally {
      setIsDeleteReportModalOpen(false);
      setTargetId(null);
    }
  };

  const handleResolveReport = async (sessionId, userId) => {
    try {
      await adminAPI.resolveSessionReports(sessionId, userId);
      
      // 로컬 상태 업데이트: 신고 목록 배지 즉시 갱신
      setUserChats(prev => prev.map(c => 
        c.id === sessionId ? { ...c, pending_count: 0 } : c
      ));

      setAlertModal({
        isOpen: true,
        title: "신고 처리 완료",
        message: "해당 신고가 '처리 완료'로 변경되었습니다."
      });

      fetchReports();
      handleViewChat(sessionId);
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: "처리 실패",
        message: "처리 상태 변경에 실패했습니다."
      });
    }
  };

  const confirmEditUser = async () => {
    try {
      // 1. 기본 정보 수정
      const updated = await adminAPI.updateUserInfo(selectedUserId, {
          username: editUsername,
          email: editEmail
      });
      
      // 2. 비밀번호가 입력되었다면 비밀번호도 수정
      if (newPassword.trim()) {
          await adminAPI.resetUserPassword(selectedUserId, newPassword);
      }

      setUsers(users.map(u => u.id === selectedUserId ? updated : u));
      alert("사용자 정보가 성공적으로 수정되었습니다.");
      setIsEditUserModalOpen(false);
      setNewPassword(""); // 초기화
    } catch (err) {
      alert(err.response?.data?.detail || "정보 수정 실패");
    }
  };

  return (
    <div className="admin-page">
      <Sidebar 
        isOpen={true} 
        toggleSidebar={() => {}}
        onNewChat={() => {}} 
        onSelectChat={() => {}}
        isAdminView={true}
        users={users}
        selectedUserId={selectedUserId}
        onUserSelect={handleUserSelect}
        onDeleteUser={(id) => {
          setTargetId(id);
          setIsDeleteUserModalOpen(true);
        }}
        loadingUsers={loading}
        // 신고 관리 관련 추가
        activeView={activeView}
        onViewChange={(view) => {
            setActiveView(view);
            setSelectedUserId(null);
            setSelectedReportId(null);
            setUserChats([]);
            setSelectedChatMessages(null);
        }}
        reports={reports}
        selectedReportId={selectedReportId}
        onReportSelect={handleReportSelect}
        onDeleteReport={(id) => {
            setTargetId(id);
            setIsDeleteReportModalOpen(true);
        }}
        loadingReports={loadingReports}
      />
      
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-title">
              <span className="admin-badge">ADMIN</span>
              <h1>Management Console</h1>
          </div>
        </header>

                <div className="admin-grid" style={{ gridTemplateColumns: '350px 1fr' }}>
                                                                    {/* 1. 채팅 목록 섹션 */}
                                                                    <section className="admin-section chats-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                                                      <div className="section-header" style={{ flexShrink: 0, paddingBottom: '10px' }}>
                                                                        <h2>
                                                                          {activeView === 'reports' 
                                                                            ? '신고된 채팅 기록' 
                                                                            : (selectedUserId ? '사용자 채팅 기록' : '전체 대화 검색')
                                                                          }
                                                                        </h2>
                                                                        
                                                                        {/* 채팅 목록 내 검색바 (사용자 미선택 시 전체 검색 모드로 작동) */}
                                                                        {(activeView === 'users' || selectedReportId) && (
                                                                          <div style={{ marginTop: '12px', position: 'relative' }}>
                                                                            <input
                                                                              type="text"
                                                                              placeholder={!selectedUserId && activeView === 'users' ? "전체 대화 키워드 검색..." : "채팅방 제목 검색..."}
                                                                              value={chatSearchQuery}
                                                                              onChange={(e) => setChatSearchQuery(e.target.value)}
                                                                              style={{
                                                                                width: '100%',
                                                                                padding: '6px 10px 6px 28px',
                                                                                borderRadius: '8px',
                                                                                border: '1px solid #d2d2d7',
                                                                                fontSize: '12px',
                                                                                outline: 'none',
                                                                                backgroundColor: '#f5f5f7'
                                                                              }}
                                                                            />
                                                                            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>🔍</span>
                                                                            {chatSearchQuery && (
                                                                              <button 
                                                                                onClick={() => setChatSearchQuery("")}
                                                                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#86868b', cursor: 'pointer' }}
                                                                              >✕</button>
                                                                            )}
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                                      
                                                                      <div className="chat-list" style={{ flex: 1, overflowY: 'auto' }}>
                                                                        {activeView === 'reports' && !selectedReportId ? (
                                                                          <div className="empty-state">신고 내역을 선택하여 채팅 목록을 확인하세요.</div>
                                                                        ) : chatsLoading ? (
                                                                          <div className="loading">채팅 목록 불러오는 중...</div>
                                                                        ) : userChats.length === 0 ? (
                                                                          <div className="empty-state">대화 기록이 없습니다.</div>
                                                                        ) : (
                                                                          userChats
                                                                            .filter(c => (!selectedUserId && activeView === 'users') ? true : c.title?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                                                                            .map(c => (
                                                                              <div 
                                                                                key={c.id} 
                                                                                className={`chat-card ${selectedChatMessages?.id === c.id ? 'active' : ''} ${c.pending_count > 0 ? 'has-pending' : ''}`}
                                                                                onClick={() => handleViewChat(c.id)}
                                                                                style={{
                                                                                    position: 'relative',
                                                                                    borderLeft: c.pending_count > 0 ? '4px solid #FF3B30' : (selectedChatMessages?.id === c.id ? '4px solid #183072' : '4px solid transparent'),
                                                                                    backgroundColor: c.pending_count > 0 ? 'rgba(255, 59, 48, 0.02)' : 'inherit'
                                                                                }}
                                                                              >
                                                                                                      {/* 미처리 신고 알림 점 (Unread Dot style) */}
                                                                                                      {c.pending_count > 0 && (
                                                                                                          <div style={{
                                                                                                              position: 'absolute',
                                                                                                              top: '14px',
                                                                                                              right: '12px',
                                                                                                              width: '8px',
                                                                                                              height: '8px',
                                                                                                              borderRadius: '50%',
                                                                                                              backgroundColor: '#FF3B30',
                                                                                                              boxShadow: '0 0 0 2px white, 0 0 5px rgba(255, 59, 48, 0.5)'
                                                                                                          }}></div>
                                                                                                      )}
                                                                                                      <div className="chat-card-content">
                                                                                                        <div className="chat-card-info" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                                                                          <span className="c-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                                                                                                            {c.title}
                                                                                                          </span>
                                                                                                                                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                                                                                <span className="c-date" style={{ fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                                                                                                                                    {(() => {
                                                                                                                                                                        const formatted = formatDate(c.updated_at || c.created_at);
                                                                                                                                                                        // 전체 검색 모드이고, 결과가 마침표(.)를 포함한 '절대 날짜' 형식인 경우에만 줄임 처리
                                                                                                                                                                        if (!selectedUserId && activeView === 'users' && formatted.includes('.')) {
                                                                                                                                                                            const [datePart] = formatted.split(' ');
                                                                                                                                                                            return datePart.substring(2); // 2026.02.11 -> 26.02.11
                                                                                                                                                                        }
                                                                                                                                                                        return formatted; // '방금 전', '5분 전', '어제' 등은 그대로 반환
                                                                                                                                                                    })()}
                                                                                                                                                                </span>
                                                                                                                                                                {/* 신고 상태 배지 추가 */}
                                                                                                                                                                {c.report_count > 0 && (
                                                                                                                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                                                                                                                        {c.pending_count > 0 ? (
                                                                                                                                                                            <span style={{ 
                                                                                                                                                                                fontSize: '9px', background: '#FF3B30', color: 'white', 
                                                                                                                                                                                padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' 
                                                                                                                                                                            }}>
                                                                                                                                                                                신고 {c.pending_count}
                                                                                                                                                                            </span>
                                                                                                                                                                        ) : (
                                                                                                                                                                            <span style={{ 
                                                                                                                                                                                fontSize: '9px', background: '#34C759', color: 'white', 
                                                                                                                                                                                padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' 
                                                                                                                                                                            }}>
                                                                                                                                                                                해결됨
                                                                                                                                                                            </span>
                                                                                                                                                                        )}
                                                                                                                                                                    </div>
                                                                                                                                                                )}
                                                                                                                                                                {!selectedUserId && activeView === 'users' && (
                                                                                                                                                                                                                                                    <span style={{ 
                                                                                                                    fontSize: '10px', 
                                                                                                                    color: '#183072', 
                                                                                                                    background: 'rgba(24, 48, 114, 0.05)', 
                                                                                                                    padding: '1px 6px', 
                                                                                                                    borderRadius: '4px',
                                                                                                                    whiteSpace: 'nowrap',
                                                                                                                    overflow: 'hidden',
                                                                                                                    textOverflow: 'ellipsis',
                                                                                                                    maxWidth: '120px'
                                                                                                                }}>
                                                                                                                    {c.email}
                                                                                                                </span>
                                                                                                            )}
                                                                                                          </div>
                                                                                                        </div>
                                                                                
                                                                                                                        <div className="chat-card-meta">
                                                                <span className="c-count">{c.message_count} messages</span>
                                                                <button 
                                                                  className="c-delete-btn" 
                                                                  onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      if (activeView === 'reports') {
                                                                          setTargetId(`${selectedReportId}-${c.id}`); // userId-sessionId
                                                                          setIsDeleteReportModalOpen(true);
                                                                      } else {
                                                                          setTargetId(c.id);
                                                                          setIsDeleteChatModalOpen(true);
                                                                      }
                                                                  }}
                                                                  title={activeView === 'reports' ? "신고 무시" : "채팅 삭제"}
                                                                >
                                                                  ✕
                                                                </button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        ))
                                                      )}
                                                    </div>
                                        
                                                    {/* 사용자 상세 정보 카드 (다시 하단 배치) */}
                                                    {activeView === 'users' && selectedUserId && (
                                                      <div className="user-detail-card" style={{ 
                                                          padding: '20px',
                                                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                          backdropFilter: 'blur(10px)',
                                                          borderTop: '1px solid #d2d2d7',
                                                          flexShrink: 0,
                                                          boxShadow: '0 -2px 8px rgba(0,0,0,0.02)'
                                                      }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                                                          <div style={{ 
                                                              width: '42px', height: '42px', borderRadius: '12px', 
                                                              background: 'linear-gradient(135deg, #183072 0%, #22449C 100%)', 
                                                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                              fontSize: '18px', fontWeight: '600', boxShadow: '0 4px 10px rgba(24, 48, 114, 0.2)'
                                                          }}>
                                                            {users.find(u => u.id === selectedUserId)?.username?.charAt(0) || 'U'}
                                                          </div>
                                                                            <div style={{ flex: 1 }}>
                                                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#1d1d1f' }}>
                                                                                      {users.find(u => u.id === selectedUserId)?.username}
                                                                                  </h3>
                                                                                  <button 
                                                                                    onClick={() => {
                                                                                      const u = users.find(u => u.id === selectedUserId);
                                                                                      setEditUsername(u?.username || "");
                                                                                      setEditEmail(u?.email || "");
                                                                                      setNewPassword(""); // 비움
                                                                                      setIsEditUserModalOpen(true);
                                                                                    }}
                                                                                    style={{
                                                                                      padding: '4px', borderRadius: '6px', border: 'none',
                                                                                      background: 'none', fontSize: '14px', cursor: 'pointer',
                                                                                      color: '#86868b', transition: 'all 0.2s', display: 'flex'
                                                                                    }}
                                                                                    onMouseOver={(e) => e.currentTarget.style.color = '#183072'}
                                                                                    onMouseOut={(e) => e.currentTarget.style.color = '#86868b'}
                                                                                    title="계정 설정"
                                                                                  >⚙️</button>
                                                                                  <span style={{ 
                                                                                      fontSize: '9px', fontWeight: '700', color: '#34c759', 
                                                                                      padding: '2px 6px', borderRadius: '4px', border: '1px solid #34c759',
                                                                                      textTransform: 'uppercase', marginLeft: 'auto'
                                                                                  }}>
                                                                                    Active
                                                                                  </span>
                                                                              </div>
                                                                              <p style={{ fontSize: '12px', color: '#86868b', margin: '2px 0 0 0' }}>{users.find(u => u.id === selectedUserId)?.email}</p>
                                                                            </div>
                                                          
                                                                            </div>
                                                                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                          <div className="info-item">
                                                            <p style={{ fontSize: '10px', color: '#86868b', marginBottom: '4px', fontWeight: '600', letterSpacing: '0.05em' }}>MEMBER SINCE</p>
                                                            <p style={{ fontSize: '12px', fontWeight: '500', color: '#1d1d1f' }}>
                                                                {formatDate(users.find(u => u.id === selectedUserId)?.created_at)}
                                                            </p>
                                                          </div>
                                                          <div className="info-item">
                                                            <p style={{ fontSize: '10px', color: '#86868b', marginBottom: '4px', fontWeight: '600', letterSpacing: '0.05em' }}>LAST LOGIN</p>
                                                            <p style={{ fontSize: '12px', fontWeight: '500', color: '#1d1d1f' }}>
                                                                {formatDate(users.find(u => u.id === selectedUserId)?.last_login) || 'None'}
                                                            </p>
                                                          </div>
                                                          <div className="info-item" style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                                                            <p style={{ fontSize: '10px', color: '#86868b', marginBottom: '4px', fontWeight: '600', letterSpacing: '0.05em' }}>LAST KNOWN IP</p>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d2d2d7' }}></div>
                                                                <p style={{ fontSize: '12px', fontWeight: '500', color: '#1d1d1f', fontFamily: 'monospace' }}>
                                                                    {users.find(u => u.id === selectedUserId)?.last_ip || '0.0.0.0'}
                                                                </p>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </section>
                                                          
                            {/* 2. 대화 내용 섹션 */}
                            <section className="admin-section detail-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                              <div className="section-header" style={{ flexShrink: 0 }}>
                                <h2>{activeView === 'reports' ? '신고 상세 및 대화 기록' : '대화 상세'}</h2>
                              </div>
                  
                              <div className="messages-display" style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
                  
                      {!selectedChatMessages ? (
                        <div className="empty-state">
                            {activeView === 'reports' ? '신고된 채팅방을 선택하여 내용을 확인하세요.' : '채팅방을 선택하여 내용을 확인하세요.'}
                        </div>
                      ) : (
                        <>
                          {activeView === 'reports' && selectedChatMessages.reportReasons && (
                            <div className="report-info-box" style={{ 
                                position: 'sticky',
                                top: '-2rem',
                                left: 0,
                                right: 0,
                                backgroundColor: '#FFF0F0', 
                                border: '1px solid #FF3B30', 
                                padding: '16px', 
                                borderRadius: '12px',
                                marginBottom: '24px',
                                color: '#FF3B30',
                                boxShadow: '0 8px 24px rgba(255, 59, 48, 0.15)',
                                zIndex: 10
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                  <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 'bold' }}>🚨 신고 사유 ({selectedChatMessages.reportReasons.length}건)</h3>
                                  {selectedChatMessages.reportReasons.some(r => r.status === 'pending') && (
                                      <button 
                                          onClick={() => handleResolveReport(selectedChatMessages.id, selectedReportId)}
                                          style={{
                                              padding: '4px 10px', borderRadius: '6px', border: 'none',
                                              backgroundColor: '#FF3B30', color: 'white', fontSize: '11px',
                                              fontWeight: 'bold', cursor: 'pointer'
                                          }}
                                      >처리 완료로 변경</button>
                                  )}
                              </div>
                              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                  {selectedChatMessages.reportReasons.map((r, idx) => (
                                      <li key={idx} style={{ fontSize: '14px', lineHeight: '1.6', color: '#1D1D1F', marginBottom: '4px' }}>
                                          <span style={{ 
                                              fontSize: '10px', 
                                              padding: '1px 4px', 
                                              borderRadius: '4px', 
                                              marginRight: '8px',
                                              backgroundColor: r.status === 'resolved' ? '#34c759' : '#FF3B30',
                                              color: 'white',
                                              fontWeight: 'bold'
                                          }}>
                                              {r.status === 'resolved' ? '처리 완료' : '처리 중'}
                                          </span>
                                          {r.reason || "(사유 미입력)"}
                                      </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedChatMessages.messages.map(m => {
                            const isReported = m.report_status !== null;
                            const isResolved = m.report_status === 'resolved';
                            
                            return (
                              <div 
                                key={m.id} 
                                className={`admin-message-bubble ${m.role}`}
                                style={isReported ? {
                                    border: isResolved ? '2px solid #34c759' : '2px solid #FF3B30',
                                    borderRadius: '18px',
                                    padding: '12px',
                                    backgroundColor: isResolved ? '#F9FFF9' : '#FFF9F9',
                                    position: 'relative',
                                    margin: '10px 0'
                                } : {}}
                              >
                                {isReported && (
                                  <div style={{
                                      position: 'absolute',
                                      top: '-10px',
                                      right: '10px',
                                      backgroundColor: isResolved ? '#34c759' : '#FF3B30',
                                      color: 'white',
                                      fontSize: '10px',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontWeight: 'bold'
                                  }}>
                                    {isResolved ? 'REPORT RESOLVED' : 'REPORT PENDING'}
                                  </div>
                                )}
                                <span className="msg-tag">{m.role === 'user' ? '사용자' : 'AI'}</span>
                                <div className={`msg-text ${m.role === 'assistant' ? 'markdown-body' : ''}`}>
                                  {/* 첨부파일 (이미지/PDF) 표시 */}
                                  {m.files && m.files.length > 0 && (
                                    <div className="message-images" style={{ marginBottom: '10px' }}>
                                      {m.files.map((file, fileIndex) => {
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
                                              style={{ 
                                                  maxWidth: '200px', 
                                                  maxHeight: '200px', 
                                                  borderRadius: '8px',
                                                  cursor: 'zoom-in',
                                                  margin: '4px'
                                              }}
                                              onClick={() => {
                                                  setLightboxSrc(file.preview || file.url);
                                                  setIsLightboxOpen(true);
                                              }}
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
                                                          {m.content || ''}
                                                        </ReactMarkdown>
                                                      </div>
                                                    </div>
                                
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                  </section>
                </div>
        
      </div>

      {/* 공통 디자인 모달들 */}
      <Modal
        isOpen={isDeleteUserModalOpen}
        title="사용자 삭제"
        message={"이 사용자를 삭제하시겠습니까?\n모든 데이터가 영구히 삭제됩니다."}
        confirmText="삭제"
        cancelText="취소"
        isDanger={true}
        onConfirm={confirmDeleteUser}
        onCancel={() => setIsDeleteUserModalOpen(false)}
      />

      <Modal
        isOpen={isDeleteChatModalOpen}
        title="채팅 기록 삭제"
        message="이 채팅 기록을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        isDanger={true}
        onConfirm={confirmDeleteChat}
        onCancel={() => setIsDeleteChatModalOpen(false)}
      />

      <Modal
        isOpen={isDeleteReportModalOpen}
        title="신고 내역 삭제"
        message="이 신고 내역을 목록에서 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        isDanger={true}
        onConfirm={confirmDeleteReport}
        onCancel={() => setIsDeleteReportModalOpen(false)}
      />

      {/* 알림 모달 (alert() 대체용) */}
      <Modal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal({ ...alertModal, isOpen: false })}
        showCancel={false}
      />

      {/* 사용자 정보 수정 및 비밀번호 초기화 통합 모달 */}
      <Modal
        isOpen={isEditUserModalOpen}
        title="사용자 계정 설정"
        confirmText="저장하기"
        cancelText="취소"
        onConfirm={confirmEditUser}
        onCancel={() => setIsEditUserModalOpen(false)}
      >
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '4px 0', borderBottom: '1px solid #f2f2f2' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#183072', marginBottom: '8px', textTransform: 'uppercase' }}>기본 정보</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#86868b', marginBottom: '4px', display: 'block' }}>사용자 이름</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d2d2d7', outline: 'none', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#86868b', marginBottom: '4px', display: 'block' }}>이메일 (ID)</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d2d2d7', outline: 'none', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '4px 0' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#ff3b30', marginBottom: '8px', textTransform: 'uppercase' }}>보안 설정</p>
            <div>
              <label style={{ fontSize: '12px', color: '#86868b', marginBottom: '4px', display: 'block' }}>새 비밀번호 (변경 시에만 입력)</label>
              <input 
                type="password" 
                placeholder="비워두면 기존 비밀번호 유지"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d2d2d7', outline: 'none', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 이미지 라이트박스 */}
      <Lightbox 
        src={lightboxSrc} 
        isOpen={isLightboxOpen} 
        onClose={() => setIsLightboxOpen(false)} 
      />
    </div>
  );
};

export default AdminDashboard;

