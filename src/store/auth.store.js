import { create } from 'zustand';
import { login as apiLogin, signup as apiSignup, logout as apiLogout, getMe } from '../api/auth.api';

const useAuthStore = create((set, get) => ({
  user: null,
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  error: null,

  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ loading: false }); return; }
    try {
      const data = await getMe();
      const saved = localStorage.getItem('activeWorkspaceId');
      const active = data.workspaces.find(w => w.id === saved) || data.workspaces[0] || null;
      set({ user: data.user, workspaces: data.workspaces, activeWorkspace: active, loading: false });
    } catch { localStorage.clear(); set({ loading: false }); }
  },

  login: async (email, password) => {
    set({ error: null });
    const data = await apiLogin({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const active = data.workspaces[0] || null;
    if (active) localStorage.setItem('activeWorkspaceId', active.id);
    set({ user: data.user, workspaces: data.workspaces, activeWorkspace: active });
    return data;
  },

  signup: async (name, email, password) => {
    set({ error: null });
    const data = await apiSignup({ name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('activeWorkspaceId', data.workspace.id);
    set({ user: data.user, workspaces: [{ ...data.workspace, role: 'admin' }], activeWorkspace: { ...data.workspace, role: 'admin' } });
    return data;
  },

  logout: async () => {
    try { await apiLogout({ refreshToken: localStorage.getItem('refreshToken') }); } catch {}
    localStorage.clear();
    set({ user: null, workspaces: [], activeWorkspace: null });
  },

  setActiveWorkspace: (ws) => {
    localStorage.setItem('activeWorkspaceId', ws.id);
    set({ activeWorkspace: ws });
  },

  setWorkspaces: (workspaces) => set({ workspaces }),
}));

export default useAuthStore;
