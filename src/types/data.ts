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

// AI分析专用的完整元数据结构
export interface DatasetMetadata {
  // 基本信息
  basic: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt?: string;
  };
  
  // 文件信息
  file: {
    fileName: string;
    fileSize: number;
    fileSizeFormatted: string;
    fileType: string;
    fileExtension: string;
    encoding?: string;
    uploadTime: Date;
    processingTime?: number;
  };
  
  // 数据结构信息
  structure: {
    totalRows: number;
    totalColumns: number;
    actualDataRows: number; // 排除空行后的实际数据行数
    columnTypes: {
      string: number;
      number: number;
      date: number;
      boolean: number;
    };
    memoryUsage?: number;
  };
  
  // 详细列信息
  columns: EnhancedColumnInfo[];
  
  // 数据质量信息
  quality: {
    completeness: {
      totalCells: number;
      filledCells: number;
      emptyCells: number;
      completenessRate: number;
    };
    uniqueness: {
      totalRows: number;
      uniqueRows: number;
      duplicateRows: number;
      duplicateRate: number;
    };
    consistency: {
      issues: DataQualityIssue[];
      score: number; // 0-100 的质量分数
    };
  };
  
  // 数据分布和统计
  statistics: {
    numericColumns: ColumnStatistics[];
    categoricalColumns: CategoryStatistics[];
    dateColumns: DateStatistics[];
  };
  
  // Excel特定信息（如果适用）
  excel?: {
    totalSheets: number;
    sheetsInfo: SheetMetadata[];
    dataSourceDistribution: Record<string, { count: number; percentage: number }>;
    crossSheetRelations?: string[];
  };
  
  // 数据预览
  preview: {
    sampleRows: any[];
    sampleSize: number;
    randomSample: any[];
    representativeRows: any[];
  };
  
  // 业务语义推断
  semantics: {
    possibleKeyColumns: string[];
    possibleDateColumns: string[];
    possibleCurrencyColumns: string[];
    possibleCategoryColumns: string[];
    tableType: 'transactional' | 'analytical' | 'master' | 'reference' | 'unknown';
    businessDomain: string[];
  };
  
  // 可视化建议
  visualization: {
    recommendedChartTypes: string[];
    keyColumns: string[];
    trends: string[];
    correlations: string[];
  };
}

// 增强的列信息
export interface EnhancedColumnInfo extends ColumnInfo {
  // 基础统计
  statistics?: {
    count: number;
    nullCount: number;
    uniqueCount: number;
    nullRate: number;
    uniqueRate: number;
  };
  
  // 数值列特有信息
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    quartiles: [number, number, number]; // Q1, Q2, Q3
    outliers: number;
  };
  
  // 文本列特有信息
  textStats?: {
    minLength: number;
    maxLength: number;
    avgLength: number;
    patterns: string[];
    commonValues: Array<{ value: string; count: number; percentage: number }>;
  };
  
  // 日期列特有信息
  dateStats?: {
    minDate: Date;
    maxDate: Date;
    dateRange: number; // 天数
    commonFormats: string[];
    timePatterns: string[];
  };
  
  // 业务语义
  semanticType?: {
    category: 'identifier' | 'measure' | 'dimension' | 'date' | 'text' | 'other';
    confidence: number;
    possibleMeanings: string[];
  };
}

// 数据质量问题
export interface DataQualityIssue {
  type: 'missing_values' | 'duplicates' | 'inconsistent_format' | 'outliers' | 'invalid_data';
  column?: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  examples: any[];
}

// 列统计信息
export interface ColumnStatistics {
  name: string;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  quartiles: number[];
  distribution: 'normal' | 'skewed' | 'uniform' | 'bimodal' | 'unknown';
  outliers: number[];
}

export interface CategoryStatistics {
  name: string;
  uniqueValues: number;
  topValues: Array<{ value: string; count: number; percentage: number }>;
  entropy: number;
  cardinality: 'low' | 'medium' | 'high';
}

export interface DateStatistics {
  name: string;
  minDate: Date;
  maxDate: Date;
  dateRange: number;
  granularity: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';
  gaps: number;
  trends: string[];
}

// Sheet元数据
export interface SheetMetadata {
  name: string;
  index: number;
  rows: number;
  columns: number;
  dataType: string;
  purpose: string;
  keyColumns: string[];
}

// 业务域类型
export type BusinessDomain = 
  | 'sales' | 'marketing' | 'finance' | 'hr' | 'operations' 
  | 'inventory' | 'customer' | 'product' | 'transaction' | 'analytics' | 'unknown';