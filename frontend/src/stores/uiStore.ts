import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Notifications
  notifications: Notification[];

  // Modal states
  activeModal: string | null;
  modalData: Record<string, unknown> | null;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Confirmation dialog
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
    variant: 'default' | 'destructive';
  };
}

interface UIActions {
  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modal
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Confirmation dialog
  showConfirmDialog: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'default' | 'destructive';
  }) => void;
  hideConfirmDialog: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
      notifications: [],
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: null,
      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null,
        onCancel: null,
        variant: 'default',
      },

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Theme actions
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          root.classList.remove('light', 'dark');

          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        }
      },

      // Notification actions
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(7);
        const newNotification = { ...notification, id };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove after duration
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // Modal actions
      openModal: (modalId, data = {}) =>
        set({
          activeModal: modalId,
          modalData: data,
        }),

      closeModal: () =>
        set({
          activeModal: null,
          modalData: null,
        }),

      // Loading actions
      setGlobalLoading: (loading, message = undefined) =>
        set({
          globalLoading: loading,
          loadingMessage: message,
        }),

      // Confirmation dialog actions
      showConfirmDialog: (options) =>
        set({
          confirmDialog: {
            isOpen: true,
            title: options.title,
            message: options.message,
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            onConfirm: options.onConfirm,
            onCancel: options.onCancel || null,
            variant: options.variant || 'default',
          },
        }),

      hideConfirmDialog: () =>
        set((state) => ({
          confirmDialog: {
            ...state.confirmDialog,
            isOpen: false,
            onConfirm: null,
            onCancel: null,
          },
        })),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

// Helper hooks
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUIStore();
  return { notifications, addNotification, removeNotification, clearNotifications };
};

export const useSidebar = () => {
  const {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarOpen,
    toggleSidebarCollapse,
    setSidebarCollapsed,
  } = useUIStore();
  return {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarOpen,
    toggleSidebarCollapse,
    setSidebarCollapsed,
  };
};

export const useTheme = () => {
  const { theme, setTheme } = useUIStore();
  return { theme, setTheme };
};

export const useModal = () => {
  const { activeModal, modalData, openModal, closeModal } = useUIStore();
  return { activeModal, modalData, openModal, closeModal };
};

export const useConfirmDialog = () => {
  const { confirmDialog, showConfirmDialog, hideConfirmDialog } = useUIStore();
  return { confirmDialog, showConfirmDialog, hideConfirmDialog };
};

export const useGlobalLoading = () => {
  const { globalLoading, loadingMessage, setGlobalLoading } = useUIStore();
  return { globalLoading, loadingMessage, setGlobalLoading };
};
