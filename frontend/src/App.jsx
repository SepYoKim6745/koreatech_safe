import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ChatInterface from './components/ChatInterface'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { AuthProvider, useAuth } from './context/AuthContext'
import './styles/App.css'
import './styles/Auth.css'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="auth-container">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }

  const handleSelectChat = (sessionId) => {
    setCurrentSessionId(sessionId);
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
          <div 
            className="header-branding" 
            onClick={toggleSidebar} 
            style={{cursor: 'pointer'}}
            title={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App