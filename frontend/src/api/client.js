import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.18.1.175:8080'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  async login(username, password) {
    // Backend uses OAuth2Form which expects form-data 'username' and 'password'
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await apiClient.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  async signup(email, password, username) {
    const response = await apiClient.post('/api/auth/signup', { email, password, username });
    return response.data;
  },
  async getMe() {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
  async deleteAccount() {
    const response = await apiClient.delete('/api/auth/me');
    return response.data;
  }
};

export const chatAPI = {
  /**
   * 채팅 메시지 전송
   * @param {string} message - 사용자 메시지
   * @param {Array|null} images - base64 인코딩된 이미지 배열
   * @param {Array} history - 대화 히스토리 (클라이언트 측 히스토리, 선택적 사용)
   * @param {number|null} sessionId - 채팅방 ID (없으면 새 채팅방 생성)
   */
  async sendMessage(message, images = [], documents = [], fileNames = [], history = [], sessionId = null) {
    const response = await apiClient.post('/api/chat/message', {
      message,
      images: images || [],
      documents: documents || [],
      file_names: fileNames || [],
      history,
      session_id: sessionId
    })
    return response.data
  },

  /**
   * 채팅 메시지 스트리밍 전송
   */
  async streamMessage(message, images = [], documents = [], fileNames = [], history = [], sessionId = null, onChunk, onSessionId, signal) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        message,
        images: images || [],
        documents: documents || [],
        file_names: fileNames || [],
        history,
        session_id: sessionId
      }),
      signal: signal
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep the last incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.type === 'token') {
            onChunk(data.content);
          } else if (data.type === 'session_id') {
            if (onSessionId) onSessionId(data.id);
          } else if (data.type === 'error') {
              console.error("Stream error:", data.content);
              throw new Error(data.content);
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      }
    }
  },

  /**
   * 채팅방 목록 조회
   */
  async getSessions() {
    const response = await apiClient.get('/api/chat/sessions')
    return response.data
  },

  /**
   * 특정 채팅방의 메시지 목록 조회
   * @param {number} sessionId 
   */
  async getSessionMessages(sessionId) {
    const response = await apiClient.get(`/api/chat/sessions/${sessionId}/messages`)
    return response.data
  },

  /**
   * 채팅방 삭제
   * @param {number} sessionId 
   */
  async deleteSession(sessionId) {
    const response = await apiClient.delete(`/api/chat/sessions/${sessionId}`)
    return response.data
  },

  /**
   * 채팅방 제목 수정
   * @param {number} sessionId 
   * @param {string} newTitle 
   */
  async updateSessionTitle(sessionId, newTitle) {
    const response = await apiClient.put(`/api/chat/sessions/${sessionId}`, {
      title: newTitle
    })
    return response.data
  },

  /**
   * 이미지 업로드
   * @param {File} file - 업로드할 이미지 파일
   */
  async uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/api/chat/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * 헬스 체크
   */
  async healthCheck() {
    const response = await apiClient.get('/api/chat/health')
    return response.data
  },

  /**
   * 메시지 신고
   * @param {number} messageId 
   * @param {string} reason 
   */
  async reportMessage(messageId, reason = "") {
    const response = await apiClient.post('/api/chat/report', {
      message_id: messageId,
      reason: reason
    })
    return response.data
  },

  async exportExcel(markdown) {
    const response = await apiClient.post('/api/chat/export-excel', { markdown }, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const adminAPI = {
  async listUsers() {
    const response = await apiClient.get('/api/admin/users');
    return response.data;
  },
  async deleteUser(userId) {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);
    return response.data;
  },
  async updateUserInfo(userId, data) {
    const response = await apiClient.put(`/api/admin/users/${userId}`, data);
    return response.data;
  },
  async resetUserPassword(userId, newPassword) {
    const response = await apiClient.put(`/api/admin/users/${userId}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  },
  async listUserChats(userId) {
    const response = await apiClient.get(`/api/admin/users/${userId}/chats`);
    return response.data;
  },
  async listAllChats(keyword = "") {
    const params = keyword ? { keyword } : {};
    const response = await apiClient.get('/api/admin/chats', { params });
    return response.data;
  },
  async getChatMessages(sessionId) {
    const response = await apiClient.get(`/api/admin/chats/${sessionId}`);
    return response.data;
  },
  async deleteChat(sessionId) {
    const response = await apiClient.delete(`/api/admin/chats/${sessionId}`);
    return response.data;
  },
  async listReports() {
    const response = await apiClient.get('/api/admin/reports');
    return response.data;
  },
  async deleteReport(reportId) {
    const response = await apiClient.delete(`/api/admin/reports/${reportId}`);
    return response.data;
  },
  async getReportDetails(sessionId, userId) {
    const response = await apiClient.get(`/api/admin/reports/session/${sessionId}/user/${userId}`);
    return response.data;
  },
  async resolveSessionReports(sessionId, userId) {
    const response = await apiClient.put(`/api/admin/reports/session/${sessionId}/user/${userId}/resolve`);
    return response.data;
  },
  async deleteSessionReports(sessionId, userId) {
    const response = await apiClient.delete(`/api/admin/reports/session/${sessionId}/user/${userId}`);
    return response.data;
  }
};

export default apiClient