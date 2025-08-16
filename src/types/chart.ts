// 图表相关类型定义

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'mermaid';

export type MermaidChartType = 
  | 'flowchart'    // 流程图
  | 'sequence'     // 序列图
  | 'gantt'        // 甘特图
  | 'pie'          // 饼图
  | 'quadrant'     // 象限图
  | 'gitgraph'     // Git图
  | 'mindmap'      // 思维导图
  | 'timeline'     // 时间线
  | 'sankey'       // 桑基图
  | 'xyChart'      // XY图表
  | 'block'        // 块图
  | 'er'           // 实体关系图
  | 'journey'      // 用户旅程图
  | 'class'        // 类图
  | 'state'        // 状态图
  | 'requirement'  // 需求图
  | 'c4'           // C4架构图
  | 'graph';       // 通用图

export interface ChartConfig {
  type: ChartType;
  title: string;
  data: any[];
  options: any; // ECharts配置对象或Mermaid配置
  exportable: boolean;
  interactive: boolean;
}

export interface MermaidChartConfig {
  type: 'mermaid';
  mermaidType: MermaidChartType;
  title: string;
  description?: string;
  mermaidCode: string; // Mermaid图表代码
  sourceVisible: boolean; // 是否显示源码
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
