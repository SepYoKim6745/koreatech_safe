import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);

      // 200 OK 응답이지만 success가 false인 경우 (하위 호환성)
      if (data.success === false) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);
      await fetchUser();
      return true;
    } catch (error) {
      // axios 에러에서 서버 메시지 추출
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  };

  const signup = async (email, password, username) => {
    try {
      await authAPI.signup(email, password, username);
      return true;
    } catch (error) {
      if (error.response?.data?.detail) {
        // Pydantic 검증 에러 (배열)인 경우
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          const messages = detail.map(d => d.msg?.replace('Value error, ', '') || d.msg).join('\n');
          throw new Error(messages);
        }
        throw new Error(detail);
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const userData = await authAPI.getMe();
      setUser(userData);
    } catch (error) {
      // 토큰 만료 등의 이유로 실패 시 로그아웃 처리
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
