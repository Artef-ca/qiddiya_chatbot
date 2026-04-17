import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface UiState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  isMobile: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  sidebarOpen: false,
  rightPanelOpen: false,
  theme: 'system',
  isMobile: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleRightPanel: (state) => {
      state.rightPanelOpen = !state.rightPanelOpen;
      // Close left sidebar when opening right panel
      if (state.rightPanelOpen) {
        state.sidebarOpen = false;
      }
    },
    setRightPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.rightPanelOpen = action.payload;
      // Close left sidebar when opening right panel
      if (action.payload) {
        state.sidebarOpen = false;
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        id: `toast-${Date.now()}-${Math.random()}`,
        duration: 3000,
        ...action.payload,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleRightPanel,
  setRightPanelOpen,
  setTheme,
  setIsMobile,
  addToast,
  removeToast,
} = uiSlice.actions;

export default uiSlice.reducer;

