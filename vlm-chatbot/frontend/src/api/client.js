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
   * @param {string|null} image - base64 인코딩된 이미지
   * @param {Array} history - 대화 히스토리
   */
  async sendMessage(message, image = null, history = []) {
    const response = await apiClient.post('/api/chat/message', {
      message,
      image,
      history,
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
