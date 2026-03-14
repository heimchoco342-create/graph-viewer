import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
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
