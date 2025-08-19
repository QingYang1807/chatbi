// 类型定义导出文件

export * from './chat';
export * from './data';
export * from './chart';
export * from './api';
export * from './window';

// 通用类型
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
}

export interface FileUploadConfig {
  maxSize: number; // bytes
  acceptedTypes: string[];
  maxFiles: number;
}

export interface AppConfig {
  name: string;
  version: string;
  apiBaseUrl: string;
  fileUpload: FileUploadConfig;
  supportedModels: string[];
}
