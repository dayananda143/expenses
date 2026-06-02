import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('expenses_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('expenses_token');
      if (window.location.pathname !== '/login') {
        sessionStorage.setItem('expenses_redirect', window.location.pathname + window.location.search);
        window.location.href = '/login';
      }
    }
    return Promise.reject(err.response?.data ?? err);
  }
);

export default client;
