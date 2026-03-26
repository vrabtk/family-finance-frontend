import api from './client';
const b = (w) => `/workspaces/${w}/analytics`;
export const getMonthly    = (w,p) => api.get(`${b(w)}/monthly`,{params:p}).then(r=>r.data);
export const getYearly     = (w,p) => api.get(`${b(w)}/yearly`,{params:p}).then(r=>r.data);
export const getCategories = (w,p) => api.get(`${b(w)}/categories`,{params:p}).then(r=>r.data);
export const getAllTime     = (w)   => api.get(`${b(w)}/all-time`).then(r=>r.data);
