import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      
      // 200 OK 응답이지만 success가 false인 경우 (로그인 실패)
      if (data.success === false) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);
      await fetchUser();
      return true;
    } catch (error) {
      // 에러를 상위 컴포넌트(Login.jsx)로 전달하여 UI에 표시하도록 함
      throw error;
    }
  };

  const signup = async (email, password, username) => {
    try {
      await authAPI.signup(email, password, username);
      return true;
    } catch (error) {
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
