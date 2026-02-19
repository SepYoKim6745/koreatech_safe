import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
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
        <h1 className="auth-title">로그인</h1>
        <p className="auth-subtitle">안전관리 어시스턴트에 오신 것을 환영합니다.</p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <input
              type="email"
              placeholder="이메일 주소"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <input
              type="password"
              placeholder="비밀번호"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-button">로그인</button>
        </form>

        <div className="auth-footer">
          계정이 없으신가요? 
          <span className="auth-link" onClick={() => navigate('/signup')}>회원가입</span>
        </div>
      </div>
    </div>
  );
};

export default Login;