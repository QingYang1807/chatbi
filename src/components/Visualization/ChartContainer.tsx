// 图表容器组件

import React, { useState } from 'react';
import { Space, Button, Card, Empty, Alert } from 'antd';
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, DotChartOutlined } from '@ant-design/icons';
import { ChartType, ChartGenerationOptions } from '../../types';
import { useDataStore } from '../../stores';
import { chartService } from '../../services/chartService';
import ChartRenderer from './ChartRenderer';
import './ChartContainer.css';



const ChartContainer: React.FC = () => {
  const { activeDataset } = useDataStore();
  const [generatedCharts, setGeneratedCharts] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const chartTypes: Array<{ type: ChartType; name: string; icon: React.ReactNode }> = [
    { type: 'bar', name: '柱状图', icon: <BarChartOutlined /> },
    { type: 'line', name: '折线图', icon: <LineChartOutlined /> },
    { type: 'pie', name: '饼图', icon: <PieChartOutlined /> },
    { type: 'scatter', name: '散点图', icon: <DotChartOutlined /> },
  ];

  const GenerateChart = async (chartType: ChartType) => {
    if (!activeDataset) {
      setError('请先选择数据集');
      return;
    }

    setIsGenerating(true);
    setError(undefined);

    try {
      const options: ChartGenerationOptions = {
        chartType,
        title: `${GetChartTypeName(chartType)} - ${activeDataset.name}`,
      };

      const chartConfig = chartService.GenerateChart(
        activeDataset.rows,
        options
      );

      const newChart = {
        id: `chart-${Date.now()}`,
        type: chartType,
        title: chartConfig.title,
        data: chartConfig.data,
        config: chartConfig.options,
      };

      setGeneratedCharts(prev => [...prev, newChart]);
    } catch (error) {
      console.error('生成图表失败:', error);
      setError(error instanceof Error ? error.message : '生成图表失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const GetChartTypeName = (type: ChartType): string => {
    const chartType = chartTypes.find(t => t.type === type);
    return chartType?.name || type;
  };

  const GetSmartSuggestions = () => {
    if (!activeDataset) return [];
    
    return chartService.GetChartSuggestions(activeDataset.rows);
  };

  const suggestions = GetSmartSuggestions();

  const ClearCharts = () => {
    setGeneratedCharts([]);
    setError(undefined);
  };

  if (!activeDataset) {
    return (
      <div className="chart-container">
        <Empty
          description="请先上传并选择数据集"
          image={<BarChartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
        />
      </div>
    );
  }

  return (
    <div className="chart-container">
      <Card title="图表生成器" className="chart-generator">
        {error && (
          <Alert
            message="生成失败"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(undefined)}
            style={{ marginBottom: 16 }}
          />
        )}

        <div className="generator-section">
          <h4>快速生成图表</h4>
          <Space wrap>
            {chartTypes.map((chartType) => (
              <Button
                key={chartType.type}
                icon={chartType.icon}
                onClick={() => GenerateChart(chartType.type)}
                loading={isGenerating}
                disabled={isGenerating}
              >
                {chartType.name}
              </Button>
            ))}
          </Space>
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions-section">
            <h4>智能推荐</h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <Card 
                  key={index}
                  size="small"
                  className="suggestion-card"
                  extra={
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => GenerateChart(suggestion.type)}
                      loading={isGenerating}
                    >
                      生成
                    </Button>
                  }
                >
                  <div className="suggestion-content">
                    <div className="suggestion-header">
                      <span className="suggestion-type">
                        {GetChartTypeName(suggestion.type)}
                      </span>
                      <span className="suggestion-confidence">
                        推荐度: {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                    <p className="suggestion-reason">{suggestion.reason}</p>
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {generatedCharts.length > 0 && (
          <div className="charts-actions">
            <Button onClick={ClearCharts} disabled={isGenerating}>
              清除所有图表
            </Button>
          </div>
        )}
      </Card>

      {generatedCharts.length > 0 && (
        <div className="generated-charts">
          <h3>生成的图表 ({generatedCharts.length})</h3>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {generatedCharts.map((chart) => (
              <ChartRenderer
                key={chart.id}
                chartData={chart}
                height={400}
                showActions={true}
              />
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

export default ChartContainer;
