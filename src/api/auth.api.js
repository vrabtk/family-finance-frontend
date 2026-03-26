import api from './client';
export const signup  = (d) => api.post('/auth/signup', d).then(r => r.data);
export const login   = (d) => api.post('/auth/login', d).then(r => r.data);
export const refresh = (d) => api.post('/auth/refresh', d).then(r => r.data);
export const logout  = (d) => api.post('/auth/logout', d).then(r => r.data);
export const getMe   = ()  => api.get('/auth/me').then(r => r.data);
