// 数据相关类型定义

export interface DataSet {
  id: string;
  name: string;
  fileName: string;
  columns: ColumnInfo[];
  rows: any[];
  summary: DataSummary;
  uploadTime: Date;
  size: number;
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
}

export interface DataState {
  datasets: DataSet[];
  activeDataset?: DataSet;
  isUploading: boolean;
  uploadProgress: number;
  error?: string;
}
