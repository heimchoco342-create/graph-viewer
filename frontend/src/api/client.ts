import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
});

apiClient.interceptors.request.use((config) => {
  let token: string | null = null;
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (storage && typeof storage.getItem === 'function') {
      token = storage.getItem('token');
    }
  } catch {
    // localStorage not available
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
