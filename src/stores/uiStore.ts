// UI状态管理

import { create } from 'zustand';

interface UIState {
  // 侧边栏状态
  sidebarCollapsed: boolean;
  
  // 当前活动页面
  activePage: 'chat' | 'data' | 'settings';
  
  // 模态框状态
  showDataUploadModal: boolean;
  showSettingsModal: boolean;
  showChartExportModal: boolean;
  
  // 加载状态
  globalLoading: boolean;
  
  // 通知状态
  notifications: Notification[];

  // Actions
  ToggleSidebar: () => void;
  SetSidebarCollapsed: (collapsed: boolean) => void;
  SetActivePage: (page: 'chat' | 'data' | 'settings') => void;
  ShowDataUploadModal: () => void;
  HideDataUploadModal: () => void;
  ShowSettingsModal: () => void;
  HideSettingsModal: () => void;
  ShowChartExportModal: () => void;
  HideChartExportModal: () => void;
  SetGlobalLoading: (loading: boolean) => void;
  AddNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  RemoveNotification: (id: string) => void;
  ClearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  duration?: number; // 自动消失时间（毫秒）
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  activePage: 'chat',
  showDataUploadModal: false,
  showSettingsModal: false,
  showChartExportModal: false,
  globalLoading: false,
  notifications: [],

  ToggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  SetSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  SetActivePage: (page: 'chat' | 'data' | 'settings') => {
    set({ activePage: page });
  },

  ShowDataUploadModal: () => {
    set({ showDataUploadModal: true });
  },

  HideDataUploadModal: () => {
    set({ showDataUploadModal: false });
  },

  ShowSettingsModal: () => {
    set({ showSettingsModal: true });
  },

  HideSettingsModal: () => {
    set({ showSettingsModal: false });
  },

  ShowChartExportModal: () => {
    set({ showChartExportModal: true });
  },

  HideChartExportModal: () => {
    set({ showChartExportModal: false });
  },

  SetGlobalLoading: (loading: boolean) => {
    set({ globalLoading: loading });
  },

  AddNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // 自动移除通知
    const duration = notification.duration || 5000; // 默认5秒
    setTimeout(() => {
      get().RemoveNotification(id);
    }, duration);
  },

  RemoveNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },

  ClearNotifications: () => {
    set({ notifications: [] });
  },
}));
