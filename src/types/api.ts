// API相关类型定义

import { ChartType, MermaidChartType } from './chart';

export type GLMModel = 'glm-4.5' | 'glm-4.5-air';

export interface ModelConfig {
  name: GLMModel;
  apiKey: string;
  endpoint: string;
  maxTokens: number;
  temperature: number;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter';
  charts?: ChartSuggestion[];
}

export interface ChartSuggestion {
  type: ChartType;
  title: string;
  description: string;
  data: any[];
  config: any;
  // Mermaid特定属性
  mermaidType?: MermaidChartType;
  mermaidCode?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface SettingsState {
  modelConfig: ModelConfig;
  uiPreferences: UIPreferences;
  apiKeyValid: boolean;
  lastApiCheck?: Date;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  autoGenerateCharts: boolean;
  showDataPreview: boolean;
  enableNotifications: boolean;
}
