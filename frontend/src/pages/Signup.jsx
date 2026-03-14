import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  // 모달 상태
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await signup(email, password, username);
      setIsSuccessModalOpen(true); // 성공 시 모달 열기
    } catch (err) {
      setError(err.message || '이미 사용 중인 이메일이거나 회원가입 중 오류가 발생했습니다.');
    }
  };

  const handleSuccessConfirm = () => {
    setIsSuccessModalOpen(false);
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img 
            src="/assets/kut_logo.gif" 
            onError={(e) => {e.target.src = 'https://placehold.co/140x40/FF7F00/ffffff?text=SafeChat';}} 
            alt="SafeChat AI" 
            className="auth-logo" 
        />
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-subtitle">안전한 작업 환경을 위한 첫걸음</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <input
              type="email"
              placeholder="abc@koreatech.ac.kr"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="text"
              placeholder="이름 (닉네임)"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <input
              type="password"
              placeholder="비밀번호 (8자 이상, 영문+숫자)"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="비밀번호 확인"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-button">계정 생성</button>
        </form>

        <div className="auth-footer">
          이미 계정이 있으신가요? 
          <span className="auth-link" onClick={() => navigate('/login')}>로그인</span>
        </div>
      </div>
      
      {/* 성공 알림 모달 */}
      <Modal
        isOpen={isSuccessModalOpen}
        title="회원가입 성공"
        message={"회원가입이 완료되었습니다."}
        confirmText="확인"
        showCancel={false}
        onConfirm={handleSuccessConfirm}
      />
    </div>
  );
};

export default Signup;