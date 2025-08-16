// 图表服务 - ECharts可视化

import { ChartType, ChartConfig, ChartGenerationOptions, ChartExportOptions } from '../types';
import { EChartsOption } from 'echarts';

class ChartService {
  // 基于数据生成图表配置
  GenerateChart(
    data: any[],
    options: ChartGenerationOptions
  ): ChartConfig {
    if (!data || data.length === 0) {
      throw new Error('数据为空，无法生成图表');
    }

    const chartType = options.chartType || this.SuggestChartType(data, options);
    const config = this.CreateChartConfig(data, chartType, options);

    return {
      type: chartType,
      title: options.title || this.GenerateChartTitle(chartType, options),
      data,
      options: config,
      exportable: true,
      interactive: true,
    };
  }

  // 智能推荐图表类型
  SuggestChartType(data: any[], options: ChartGenerationOptions): ChartType {
    if (options.chartType) {
      return options.chartType;
    }

    const keys = Object.keys(data[0] || {});
    const numericFields = keys.filter(key => 
      data.every(row => !isNaN(Number(row[key])) && row[key] !== null && row[key] !== '')
    );

    // 只有一个数值字段，使用饼图
    if (numericFields.length === 1 && keys.length === 2) {
      return 'pie';
    }

    // 有时间字段，使用折线图
    const hasTimeField = keys.some(key => 
      data.some(row => {
        const value = row[key];
        const date = new Date(value);
        return !isNaN(date.getTime()) && String(value).match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
      })
    );

    if (hasTimeField && numericFields.length > 0) {
      return 'line';
    }

    // 多个数值字段，使用柱状图
    if (numericFields.length >= 2) {
      return 'bar';
    }

    // 默认使用柱状图
    return 'bar';
  }

  // 创建具体的图表配置
  private CreateChartConfig(
    data: any[],
    chartType: ChartType,
    options: ChartGenerationOptions
  ): EChartsOption {
    switch (chartType) {
      case 'bar':
        return this.CreateBarChart(data, options);
      case 'line':
        return this.CreateLineChart(data, options);
      case 'pie':
        return this.CreatePieChart(data, options);
      case 'scatter':
        return this.CreateScatterChart(data, options);
      case 'area':
        return this.CreateAreaChart(data, options);
      default:
        return this.CreateBarChart(data, options);
    }
  }

  private CreateBarChart(data: any[], options: ChartGenerationOptions): EChartsOption {
    const keys = Object.keys(data[0] || {});
    const xAxisField = options.xAxis || keys[0];
    const yAxisFields = options.yAxis || keys.filter(key => key !== xAxisField && this.IsNumericField(data, key));

    const categories = [...new Set(data.map(row => row[xAxisField]))];
    const series = yAxisFields.map(field => ({
      name: field,
      type: 'bar' as const,
      data: categories.map(category => {
        const rows = data.filter(row => row[xAxisField] === category);
        if (options.aggregation === 'sum') {
          return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
        } else if (options.aggregation === 'avg') {
          const sum = rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
          return rows.length > 0 ? sum / rows.length : 0;
        } else if (options.aggregation === 'count') {
          return rows.length;
        } else if (options.aggregation === 'max') {
          return Math.max(...rows.map(row => Number(row[field]) || 0));
        } else if (options.aggregation === 'min') {
          return Math.min(...rows.map(row => Number(row[field]) || 0));
        } else {
          return rows.length > 0 ? Number(rows[0][field]) || 0 : 0;
        }
      }),
    }));

    return {
      title: {
        text: options.title || '柱状图',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: yAxisFields,
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        name: xAxisField,
      },
      yAxis: {
        type: 'value',
        name: yAxisFields.join('/'),
      },
      series,
    };
  }

  private CreateLineChart(data: any[], options: ChartGenerationOptions): EChartsOption {
    const keys = Object.keys(data[0] || {});
    const xAxisField = options.xAxis || this.FindTimeField(data, keys) || keys[0];
    const yAxisFields = options.yAxis || keys.filter(key => key !== xAxisField && this.IsNumericField(data, key));

    // 按x轴字段排序
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[xAxisField];
      const bVal = b[xAxisField];
      
      // 如果是日期，按日期排序
      const aDate = new Date(aVal);
      const bDate = new Date(bVal);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return aDate.getTime() - bDate.getTime();
      }
      
      // 如果是数字，按数字排序
      if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        return Number(aVal) - Number(bVal);
      }
      
      // 否则按字符串排序
      return String(aVal).localeCompare(String(bVal));
    });

    const categories = sortedData.map(row => row[xAxisField]);
    const series = yAxisFields.map(field => ({
      name: field,
      type: 'line' as const,
      data: sortedData.map(row => Number(row[field]) || 0),
      smooth: true,
    }));

    return {
      title: {
        text: options.title || '折线图',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: yAxisFields,
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        name: xAxisField,
      },
      yAxis: {
        type: 'value',
        name: yAxisFields.join('/'),
      },
      series,
    };
  }

  private CreatePieChart(data: any[], options: ChartGenerationOptions): EChartsOption {
    const keys = Object.keys(data[0] || {});
    const labelField = keys.find(key => !this.IsNumericField(data, key)) || keys[0];
    const valueField = keys.find(key => this.IsNumericField(data, key)) || keys[1];

    // 聚合数据
    const aggregatedData = this.AggregateData(data, labelField, valueField, options.aggregation || 'sum');
    
    const pieData = Object.entries(aggregatedData).map(([name, value]) => ({
      name,
      value: Number(value),
    }));

    return {
      title: {
        text: options.title || '饼图',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: pieData.map(item => item.name),
      },
      series: [
        {
          name: valueField,
          type: 'pie',
          radius: '50%',
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }

  private CreateScatterChart(data: any[], options: ChartGenerationOptions): EChartsOption {
    const keys = Object.keys(data[0] || {});
    const numericFields = keys.filter(key => this.IsNumericField(data, key));
    
    if (numericFields.length < 2) {
      throw new Error('散点图需要至少两个数值字段');
    }

    const xField = options.xAxis || numericFields[0];
    const yField = options.yAxis?.[0] || numericFields[1];

    const scatterData = data.map(row => [
      Number(row[xField]) || 0,
      Number(row[yField]) || 0,
    ]);

    return {
      title: {
        text: options.title || '散点图',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: `${xField}: {c[0]}<br/>${yField}: {c[1]}`,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: xField,
      },
      yAxis: {
        type: 'value',
        name: yField,
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: 8,
        },
      ],
    };
  }

  private CreateAreaChart(data: any[], options: ChartGenerationOptions): EChartsOption {
    const lineConfig = this.CreateLineChart(data, options);
    
    // 将折线图转换为面积图
    if (lineConfig.series && Array.isArray(lineConfig.series)) {
      lineConfig.series.forEach((serie: any) => {
        serie.areaStyle = {};
      });
    }

    if (lineConfig.title && typeof lineConfig.title === 'object' && !Array.isArray(lineConfig.title)) {
      lineConfig.title.text = options.title || '面积图';
    }

    return lineConfig;
  }

  private IsNumericField(data: any[], fieldName: string): boolean {
    const sampleSize = Math.min(data.length, 10);
    const sample = data.slice(0, sampleSize);
    
    return sample.every(row => {
      const value = row[fieldName];
      return !isNaN(Number(value)) && value !== null && value !== '';
    });
  }

  private FindTimeField(data: any[], keys: string[]): string | null {
    for (const key of keys) {
      const hasValidDates = data.some(row => {
        const value = row[key];
        const date = new Date(value);
        return !isNaN(date.getTime()) && String(value).match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
      });
      
      if (hasValidDates) {
        return key;
      }
    }
    
    return null;
  }

  private AggregateData(
    data: any[],
    groupField: string,
    valueField: string,
    aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min' = 'sum'
  ): Record<string, number> {
    const grouped = data.reduce((acc, row) => {
      const key = String(row[groupField]);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(Number(row[valueField]) || 0);
      return acc;
    }, {} as Record<string, number[]>);

    const result: Record<string, number> = {};
    
    Object.entries(grouped).forEach(([key, values]) => {
      const numberValues = values as number[];
      switch (aggregation) {
        case 'sum':
          result[key] = numberValues.reduce((sum: number, val: number) => sum + val, 0);
          break;
        case 'avg':
          result[key] = numberValues.reduce((sum: number, val: number) => sum + val, 0) / numberValues.length;
          break;
        case 'count':
          result[key] = numberValues.length;
          break;
        case 'max':
          result[key] = Math.max(...numberValues);
          break;
        case 'min':
          result[key] = Math.min(...numberValues);
          break;
        default:
          result[key] = numberValues.reduce((sum: number, val: number) => sum + val, 0);
      }
    });

    return result;
  }

  private GenerateChartTitle(chartType: ChartType, options: ChartGenerationOptions): string {
    const typeNames: Record<ChartType, string> = {
      bar: '柱状图',
      line: '折线图',
      pie: '饼图',
      scatter: '散点图',
      area: '面积图',
    };

    let title = typeNames[chartType] || '图表';
    
    if (options.xAxis && options.yAxis && options.yAxis.length > 0) {
      title += ` - ${options.xAxis} vs ${options.yAxis.join('/')}`;
    }

    return title;
  }

  // 导出图表
  async ExportChart(
    chartInstance: any, // ECharts实例
    options: ChartExportOptions
  ): Promise<Blob> {
    if (!chartInstance) {
      throw new Error('图表实例不存在');
    }

    try {
      let dataUrl: string;

      switch (options.format) {
        case 'png':
          dataUrl = chartInstance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: options.backgroundColor || '#fff',
          });
          break;
        case 'svg':
          dataUrl = chartInstance.getDataURL({
            type: 'svg',
            backgroundColor: options.backgroundColor || '#fff',
          });
          break;
        default:
          throw new Error(`不支持的导出格式: ${options.format}`);
      }

      // 将data URL转换为Blob
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      throw new Error(`图表导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 获取支持的图表类型
  GetSupportedChartTypes(): Array<{ type: ChartType; name: string; description: string }> {
    return [
      { type: 'bar', name: '柱状图', description: '比较不同类别的数值大小' },
      { type: 'line', name: '折线图', description: '显示数据随时间的变化趋势' },
      { type: 'pie', name: '饼图', description: '显示各部分占整体的比例' },
      { type: 'scatter', name: '散点图', description: '显示两个变量之间的关系' },
      { type: 'area', name: '面积图', description: '显示数量随时间的累积变化' },
    ];
  }

  // 获取图表配置建议
  GetChartSuggestions(data: any[]): Array<{ type: ChartType; reason: string; confidence: number }> {
    if (!data || data.length === 0) {
      return [];
    }

    const suggestions: Array<{ type: ChartType; reason: string; confidence: number }> = [];
    const keys = Object.keys(data[0] || {});
    const numericFields = keys.filter(key => this.IsNumericField(data, key));
    const hasTimeField = this.FindTimeField(data, keys) !== null;

    // 饼图建议
    if (numericFields.length === 1 && keys.length === 2) {
      suggestions.push({
        type: 'pie',
        reason: '数据包含一个类别字段和一个数值字段，适合用饼图显示比例',
        confidence: 0.9,
      });
    }

    // 折线图建议
    if (hasTimeField && numericFields.length > 0) {
      suggestions.push({
        type: 'line',
        reason: '数据包含时间字段，适合用折线图显示趋势',
        confidence: 0.85,
      });
    }

    // 柱状图建议
    if (numericFields.length >= 1) {
      suggestions.push({
        type: 'bar',
        reason: '数据包含数值字段，可以用柱状图进行比较',
        confidence: 0.7,
      });
    }

    // 散点图建议
    if (numericFields.length >= 2) {
      suggestions.push({
        type: 'scatter',
        reason: '数据包含多个数值字段，可以用散点图显示相关性',
        confidence: 0.6,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}

export const chartService = new ChartService();
