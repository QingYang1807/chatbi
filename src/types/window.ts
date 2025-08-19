// 窗口系统类型定义

export interface WindowConfig {
  id: string;
  type: WindowType;
  title: string;
  data?: any; // 窗口特定数据
  isActive?: boolean;
  canClose?: boolean;
  canRename?: boolean;
}

export type WindowType = 'chat' | 'data' | 'visualization' | 'settings';

export interface ChatWindowData {
  sessionId: string;
  datasetId?: string;
  messages?: any[];
}

export interface DataWindowData {
  datasetId?: string;
  viewMode?: 'list' | 'grid' | 'details';
}

export interface VisualizationWindowData {
  chartId?: string;
  chartType?: string;
  data?: any;
}

// 分屏布局类型
export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitPane {
  id: string;
  type: 'split' | 'tabs';
  direction?: SplitDirection; // 只有split类型才有
  size?: number; // 分割比例 0-1
  children?: (SplitPane | string)[]; // 子面板ID或窗口ID数组
  activeTabId?: string; // 只有tabs类型才有，当前激活的tab
}

export interface WindowLayout {
  root: SplitPane;
  windows: Record<string, WindowConfig>;
}

// 窗口操作类型
export interface WindowOperation {
  type: 'create' | 'close' | 'split' | 'merge' | 'move' | 'rename' | 'activate';
  targetId?: string;
  data?: any;
}

// 分屏操作参数
export interface SplitOperation {
  direction: SplitDirection;
  size: number; // 0-1之间的分割比例
  newWindow?: WindowConfig;
}

// 默认布局配置
export const DefaultLayout: WindowLayout = {
  root: {
    id: 'root',
    type: 'tabs',
    children: ['welcome'],
    activeTabId: 'welcome'
  },
  windows: {
    welcome: {
      id: 'welcome',
      type: 'chat',
      title: '欢迎',
      canClose: false,
      canRename: false,
      isActive: true,
      data: {
        sessionId: 'welcome',
        messages: []
      } as ChatWindowData
    }
  }
};
