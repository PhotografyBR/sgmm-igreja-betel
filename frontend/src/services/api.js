import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api'
});

// Injetar token em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sgmm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirecionar para login se token expirar
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sgmm_token');
      localStorage.removeItem('sgmm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
