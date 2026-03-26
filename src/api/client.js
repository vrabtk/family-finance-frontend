import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
let isRefreshing = false, failedQueue = [];
const processQueue = (error, token=null) => { failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token)); failedQueue=[]; };
api.interceptors.response.use(res => res, async (err) => {
  const orig = err.config;
  if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
    if (isRefreshing) return new Promise((res,rej) => failedQueue.push({resolve:res,reject:rej})).then(t => { orig.headers.Authorization='Bearer '+t; return api(orig); });
    orig._retry = true; isRefreshing = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      processQueue(null, data.accessToken);
      orig.headers.Authorization = 'Bearer ' + data.accessToken;
      return api(orig);
    } catch(e) { processQueue(e,null); localStorage.clear(); window.location.href='/login'; return Promise.reject(e); }
    finally { isRefreshing = false; }
  }
  return Promise.reject(err);
});
export default api;
