// 数据相关类型定义

export interface DataSet {
  id: string;
  name: string;
  fileName: string;
  description?: string;
  columns: ColumnInfo[];
  rows: any[];
  summary: DataSummary;
  uploadTime: Date;
  createdAt: string;
  updatedAt?: string;
  size: number;
  sheets?: SheetInfo[]; // 添加Excel sheets信息
  activeSheetIndex?: number; // 当前活跃的sheet索引
}

export interface SheetInfo {
  name: string;
  columns: ColumnInfo[];
  rows: any[];
  summary: DataSummary;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
  examples: any[];
}

export interface DataSummary {
  totalRows: number;
  totalColumns: number;
  numericColumns: number;
  stringColumns: number;
  dateColumns: number;
  missingValues: number;
  duplicateRows: number;
}

export interface QueryResult {
  data: any[];
  columns: string[];
  rowCount: number;
  executionTime: number;
}

export interface DataUploadResult {
  success: boolean;
  dataset?: DataSet;
  error?: string;
  sheets?: SheetInfo[]; // 当有多个sheet时返回所有sheet信息
}

export interface DataState {
  datasets: DataSet[];
  activeDataset?: DataSet;
  isUploading: boolean;
  uploadProgress: number;
  error?: string;
}
