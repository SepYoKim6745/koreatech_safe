import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8080'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const chatAPI = {
  /**
   * 채팅 메시지 전송
   * @param {string} message - 사용자 메시지
   * @param {Array|null} images - base64 인코딩된 이미지 배열
   * @param {Array} history - 대화 히스토리 (클라이언트 측 히스토리, 선택적 사용)
   * @param {number|null} sessionId - 채팅방 ID (없으면 새 채팅방 생성)
   */
  async sendMessage(message, images = null, history = [], sessionId = null) {
    const response = await apiClient.post('/api/chat/message', {
      message,
      images,
      history,
      session_id: sessionId
    })
    return response.data
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
}

export default apiClient