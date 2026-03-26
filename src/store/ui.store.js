import { create } from 'zustand';

const useUIStore = create((set) => ({
  toast: null,
  modal: null,

  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  openModal: (name, data = {}) => set({ modal: { name, data } }),
  closeModal: () => set({ modal: null }),
}));

export default useUIStore;
