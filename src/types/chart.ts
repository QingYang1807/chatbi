// 图表相关类型定义

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

export interface ChartConfig {
  type: ChartType;
  title: string;
  data: any[];
  options: any; // ECharts配置对象
  exportable: boolean;
  interactive: boolean;
}

export interface ChartGenerationOptions {
  chartType?: ChartType;
  title?: string;
  xAxis?: string;
  yAxis?: string[];
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
}

export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'excel';
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export interface ChartMetadata {
  id: string;
  title: string;
  type: ChartType;
  createdAt: Date;
  datasetId: string;
  config: ChartConfig;
}
