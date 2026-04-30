import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000
});

http.interceptors.request.use((config) => {
  const { state } = useAuthStore();
  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }
  return config;
});

export default http;
