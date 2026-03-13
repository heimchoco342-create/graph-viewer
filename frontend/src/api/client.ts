import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
});

apiClient.interceptors.request.use((config) => {
  let token: string | null = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    // localStorage not available
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
