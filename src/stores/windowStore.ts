// 窗口管理状态

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  WindowConfig, 
  WindowLayout, 
  SplitPane, 
  WindowType, 
  SplitOperation,
  DefaultLayout
} from '../types/window';
import { storageService } from '../services/storageService';

interface WindowState {
  layout: WindowLayout;
  draggedWindow?: string;
  
  // Actions
  CreateWindow: (type: WindowType, title?: string, data?: any) => string;
  CloseWindow: (windowId: string) => void;
  RenameWindow: (windowId: string, newTitle: string) => void;
  ActivateWindow: (windowId: string) => void;
  SplitPane: (paneId: string, operation: SplitOperation) => void;
  MergePane: (paneId: string) => void;
  MoveToPaneToPane: (windowId: string, fromPaneId: string, toPaneId: string) => void;
  ResizePane: (paneId: string, size: number) => void;
  UpdateWindowData: (windowId: string, data: any) => void;
  
  // Layout management
  LoadLayout: () => Promise<void>;
  SaveLayout: () => Promise<void>;
  ResetLayout: () => void;
  
  // Helper methods
  GetActiveWindows: () => WindowConfig[];
  GetWindowById: (windowId: string) => WindowConfig | undefined;
  GetPaneById: (paneId: string, root?: SplitPane) => SplitPane | undefined;
  GetWindowPane: (windowId: string, root?: SplitPane) => SplitPane | undefined;
}

// 递归查找面板
const FindPaneById = (paneId: string, root: SplitPane): SplitPane | undefined => {
  if (root.id === paneId) return root;
  
  if (root.children) {
    for (const child of root.children) {
      if (typeof child === 'object') {
        const found = FindPaneById(paneId, child as SplitPane);
        if (found) return found;
      }
    }
  }
  
  return undefined;
};

// 递归查找包含窗口的面板
const FindWindowPane = (windowId: string, root: SplitPane): SplitPane | undefined => {
  if (root.type === 'tabs' && root.children?.includes(windowId)) {
    return root;
  }
  
  if (root.children) {
    for (const child of root.children) {
      if (typeof child === 'object') {
        const found = FindWindowPane(windowId, child as SplitPane);
        if (found) return found;
      }
    }
  }
  
  return undefined;
};

// 移除空的面板
const CleanupEmptyPanes = (root: SplitPane): SplitPane | null => {
  if (!root.children || root.children.length === 0) {
    return null;
  }
  
  // 清理子面板
  const cleanedChildren: (SplitPane | string)[] = [];
  for (const child of root.children) {
    if (typeof child === 'string') {
      cleanedChildren.push(child);
    } else {
      const cleaned = CleanupEmptyPanes(child);
      if (cleaned) {
        cleanedChildren.push(cleaned);
      }
    }
  }
  
  if (cleanedChildren.length === 0) {
    return null;
  }
  
  // 如果只有一个子元素，返回该子元素（如果是面板）或当前面板
  if (cleanedChildren.length === 1 && typeof cleanedChildren[0] === 'object') {
    return cleanedChildren[0] as SplitPane;
  }
  
  return {
    ...root,
    children: cleanedChildren
  };
};

export const useWindowStore = create<WindowState>((set, get) => ({
  layout: DefaultLayout,
  draggedWindow: undefined,

  CreateWindow: (type: WindowType, title?: string, data?: any) => {
    const windowId = uuidv4();
    const defaultTitles = {
      chat: '新建对话',
      data: '数据视图',
      visualization: '图表视图',
      settings: '设置'
    };
    
    // 为聊天窗口自动创建新的会话ID
    let windowData = data || {};
    if (type === 'chat' && !windowData.sessionId) {
      // 我们不在这里创建session，而是在窗口组件中延迟创建
      // 这样避免了循环依赖问题
      windowData = {
        ...windowData,
        // 不设置sessionId，让窗口组件自己创建
      };
    }
    
    const window: WindowConfig = {
      id: windowId,
      type,
      title: title || defaultTitles[type],
      data: windowData,
      isActive: true,
      canClose: true,
      canRename: true
    };

    set((state) => {
      const newLayout = { ...state.layout };
      newLayout.windows[windowId] = window;
      
      // 将新窗口添加到当前激活的面板
      const activePane = state.layout.root;
      if (activePane.type === 'tabs') {
        activePane.children = [...(activePane.children || []), windowId];
        activePane.activeTabId = windowId;
      } else {
        // 如果根面板不是tabs，创建一个新的tabs面板
        const newTabsPane: SplitPane = {
          id: uuidv4(),
          type: 'tabs',
          children: [windowId],
          activeTabId: windowId
        };
        newLayout.root = newTabsPane;
      }
      
      return { layout: newLayout };
    });

    // 保存布局
    get().SaveLayout();
    return windowId;
  },

  CloseWindow: (windowId: string) => {
    set((state) => {
      const newLayout = { ...state.layout };
      
      // 删除窗口
      delete newLayout.windows[windowId];
      
      // 从面板中移除窗口
      const RemoveFromPane = (pane: SplitPane): SplitPane => {
        if (pane.type === 'tabs' && pane.children) {
          const newChildren = pane.children.filter(child => child !== windowId);
          const newActiveTabId = pane.activeTabId === windowId ? 
            (newChildren.length > 0 ? newChildren[0] as string : undefined) : 
            pane.activeTabId;
          
          return {
            ...pane,
            children: newChildren,
            activeTabId: newActiveTabId
          };
        } else if (pane.children) {
          return {
            ...pane,
            children: pane.children.map(child => 
              typeof child === 'object' ? RemoveFromPane(child) : child
            )
          };
        }
        return pane;
      };
      
      newLayout.root = RemoveFromPane(newLayout.root);
      
      // 清理空面板
      const cleaned = CleanupEmptyPanes(newLayout.root);
      if (cleaned) {
        newLayout.root = cleaned;
      } else {
        // 如果所有窗口都被关闭，重置为默认布局
        return { layout: DefaultLayout };
      }
      
      return { layout: newLayout };
    });

    get().SaveLayout();
  },

  RenameWindow: (windowId: string, newTitle: string) => {
    set((state) => {
      const newLayout = { ...state.layout };
      if (newLayout.windows[windowId]) {
        newLayout.windows[windowId].title = newTitle;
      }
      return { layout: newLayout };
    });

    get().SaveLayout();
  },

  ActivateWindow: (windowId: string) => {
    set((state) => {
      const newLayout = { ...state.layout };
      
      // 找到包含此窗口的面板并激活
      const ActivateInPane = (pane: SplitPane): SplitPane => {
        if (pane.type === 'tabs' && pane.children?.includes(windowId)) {
          return {
            ...pane,
            activeTabId: windowId
          };
        } else if (pane.children) {
          return {
            ...pane,
            children: pane.children.map(child => 
              typeof child === 'object' ? ActivateInPane(child) : child
            )
          };
        }
        return pane;
      };
      
      newLayout.root = ActivateInPane(newLayout.root);
      
      // 设置窗口为激活状态
      Object.values(newLayout.windows).forEach(window => {
        window.isActive = window.id === windowId;
      });
      
      return { layout: newLayout };
    });
  },

  SplitPane: (paneId: string, operation: SplitOperation) => {
    set((state) => {
      const newLayout = { ...state.layout };
      const targetPane = get().GetPaneById(paneId, newLayout.root);
      
      if (!targetPane) return state;
      
      // 创建新的分割面板
      const newSplitPane: SplitPane = {
        id: uuidv4(),
        type: 'split',
        direction: operation.direction,
        size: operation.size,
        children: [
          targetPane,
          {
            id: uuidv4(),
            type: 'tabs',
            children: operation.newWindow ? [operation.newWindow.id] : [],
            activeTabId: operation.newWindow?.id
          }
        ]
      };
      
      // 如果有新窗口，添加到布局中
      if (operation.newWindow) {
        newLayout.windows[operation.newWindow.id] = operation.newWindow;
      }
      
      // 替换目标面板
      const ReplacePaneInParent = (root: SplitPane): SplitPane => {
        if (root.id === paneId) {
          return newSplitPane;
        }
        
        if (root.children) {
          return {
            ...root,
            children: root.children.map(child => 
              typeof child === 'object' ? ReplacePaneInParent(child) : child
            )
          };
        }
        
        return root;
      };
      
      newLayout.root = ReplacePaneInParent(newLayout.root);
      
      return { layout: newLayout };
    });

    get().SaveLayout();
  },

  MergePane: (paneId: string) => {
    // TODO: 实现面板合并逻辑
    console.log('MergePane not implemented yet', paneId);
  },

  MoveToPaneToPane: (windowId: string, fromPaneId: string, toPaneId: string) => {
    set((state) => {
      const newLayout = { ...state.layout };
      
      // 从源面板移除窗口
      const RemoveFromSourcePane = (pane: SplitPane): SplitPane => {
        if (pane.id === fromPaneId && pane.type === 'tabs') {
          const newChildren = pane.children?.filter(child => child !== windowId) || [];
          return {
            ...pane,
            children: newChildren,
            activeTabId: pane.activeTabId === windowId ? 
              (newChildren[0] as string) : pane.activeTabId
          };
        } else if (pane.children) {
          return {
            ...pane,
            children: pane.children.map(child => 
              typeof child === 'object' ? RemoveFromSourcePane(child) : child
            )
          };
        }
        return pane;
      };
      
      // 添加到目标面板
      const AddToTargetPane = (pane: SplitPane): SplitPane => {
        if (pane.id === toPaneId && pane.type === 'tabs') {
          return {
            ...pane,
            children: [...(pane.children || []), windowId],
            activeTabId: windowId
          };
        } else if (pane.children) {
          return {
            ...pane,
            children: pane.children.map(child => 
              typeof child === 'object' ? AddToTargetPane(child) : child
            )
          };
        }
        return pane;
      };
      
      newLayout.root = AddToTargetPane(RemoveFromSourcePane(newLayout.root));
      
      return { layout: newLayout };
    });

    get().SaveLayout();
  },

  ResizePane: (paneId: string, size: number) => {
    set((state) => {
      const newLayout = { ...state.layout };
      
      const UpdatePaneSize = (pane: SplitPane): SplitPane => {
        if (pane.id === paneId) {
          return { ...pane, size };
        } else if (pane.children) {
          return {
            ...pane,
            children: pane.children.map(child => 
              typeof child === 'object' ? UpdatePaneSize(child) : child
            )
          };
        }
        return pane;
      };
      
      newLayout.root = UpdatePaneSize(newLayout.root);
      
      return { layout: newLayout };
    });
  },

  UpdateWindowData: (windowId: string, data: any) => {
    set((state) => {
      const newLayout = { ...state.layout };
      if (newLayout.windows[windowId]) {
        newLayout.windows[windowId].data = { 
          ...newLayout.windows[windowId].data, 
          ...data 
        };
      }
      return { layout: newLayout };
    });
  },

  LoadLayout: async () => {
    try {
      const savedLayout = await storageService.GetWindowLayout();
      if (savedLayout) {
        set({ layout: savedLayout });
      }
    } catch (error) {
      console.error('加载窗口布局失败:', error);
    }
  },

  SaveLayout: async () => {
    try {
      const { layout } = get();
      await storageService.SaveWindowLayout(layout);
    } catch (error) {
      console.error('保存窗口布局失败:', error);
    }
  },

  ResetLayout: () => {
    set({ layout: DefaultLayout });
    get().SaveLayout();
  },

  GetActiveWindows: () => {
    const { layout } = get();
    return Object.values(layout.windows).filter(window => window.isActive);
  },

  GetWindowById: (windowId: string) => {
    const { layout } = get();
    return layout.windows[windowId];
  },

  GetPaneById: (paneId: string, root?: SplitPane) => {
    const { layout } = get();
    return FindPaneById(paneId, root || layout.root);
  },

  GetWindowPane: (windowId: string, root?: SplitPane) => {
    const { layout } = get();
    return FindWindowPane(windowId, root || layout.root);
  },
}));
