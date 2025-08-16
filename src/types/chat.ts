// 聊天相关类型定义

import { ChartType } from './chart';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  charts?: ChartData[];
  error?: boolean;
}

export interface Attachment {
  id: string;
  type: 'file' | 'image';
  name: string;
  size: number;
  url?: string;
}

export interface ChartData {
  id: string;
  type: ChartType;
  title: string;
  data: any[];
  config: any;
  // Mermaid特定属性
  mermaidType?: string;
  mermaidCode?: string;
  sourceVisible?: boolean; // 是否显示源码
}



export interface ChatContext {
  messages: ChatMessage[];
  currentDataset?: string;
  currentDatasetData?: any; // 包含实际的数据集对象
  currentDatasetMetadata?: any; // 包含完整的数据集元数据
  sessionId: string;
}

export interface ChatState {
  messages: ChatMessage[];
  currentDataset?: string;
  isLoading: boolean;
  error?: string;
}
