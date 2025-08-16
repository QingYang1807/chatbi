// 应用常量配置

export const APP_CONFIG = {
  name: 'ChatBI MVP',
  version: '1.0.0',
  description: '对话式商业智能系统',
  supportedFileTypes: ['.csv', '.xlsx', '.xls'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedModels: ['glm-4.5', 'glm-4.5-air'],
  defaultModel: 'glm-4.5',
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
} as const;

export const STORAGE_KEYS = {
  API_KEY: 'chatbi_api_key',
  MODEL_CONFIG: 'chatbi_model_config',
  UI_PREFERENCES: 'chatbi_ui_preferences',
  DATASETS: 'chatbi_datasets',
  CHAT_HISTORY: 'chatbi_chat_history',
  ACTIVE_DATASET: 'chatbi_active_dataset',
} as const;

export const CHART_TYPES = {
  BAR: 'bar',
  LINE: 'line',
  PIE: 'pie',
  SCATTER: 'scatter',
  AREA: 'area',
  RADAR: 'radar',
  FUNNEL: 'funnel',
} as const;

export const DATA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
} as const;

export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

export const UI_THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const;

export const LANGUAGES = {
  ZH: 'zh',
  EN: 'en',
} as const;
