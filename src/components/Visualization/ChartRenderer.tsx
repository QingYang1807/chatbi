// 图表渲染组件

import React, { useRef, useEffect, useState } from 'react';
import { Card, Button, Space, Dropdown, message, Switch } from 'antd';
import { DownloadOutlined, MoreOutlined, CodeOutlined, EyeOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { ChartData, ChartExportOptions } from '../../types';
import { chartService } from '../../services/chartService';
import MermaidRenderer from './MermaidRenderer';
import './ChartRenderer.css';

interface ChartRendererProps {
  chartData: ChartData;
  height?: number;
  showActions?: boolean;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  chartData, 
  height = 400, 
  showActions = true 
}) => {
  const chartRef = useRef<ReactECharts>(null);
  const [showSource, setShowSource] = useState(chartData.sourceVisible || false);
  const [mermaidError, setMermaidError] = useState<string | null>(null);

  useEffect(() => {
    // 传统图表渲染完成后的处理
    if (chartRef.current && chartData.type !== 'mermaid') {
      const chartInstance = chartRef.current.getEchartsInstance();
      
      // 添加图表点击事件
      chartInstance.on('click', (params: any) => {
        console.log('图表点击事件:', params);
        // 可以在这里添加图表交互逻辑
      });
    }
  }, [chartData]);

  // 检查是否为Mermaid图表
  const isMermaidChart = chartData.type === 'mermaid' && chartData.mermaidCode;

  const HandleExport = async (format: 'png' | 'svg') => {
    if (!chartRef.current) {
      message.error('图表未加载完成');
      return;
    }

    try {
      const chartInstance = chartRef.current.getEchartsInstance();
      const exportOptions: ChartExportOptions = {
        format,
        width: 800,
        height: 600,
        backgroundColor: '#fff',
      };

      const blob = await chartService.ExportChart(chartInstance, exportOptions);
      
      // 下载文件
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${chartData.title}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      
      message.success(`图表已导出为 ${format.toUpperCase()} 格式`);
    } catch (error) {
      console.error('导出图表失败:', error);
      message.error('导出图表失败');
    }
  };

  const GetMenuItems = () => {
    const items = [];
    
    if (!isMermaidChart) {
      items.push(
    {
      key: 'export-png',
      label: '导出为 PNG',
      onClick: () => HandleExport('png'),
    },
    {
      key: 'export-svg',
      label: '导出为 SVG',
      onClick: () => HandleExport('svg'),
        }
      );
    }
    
    if (isMermaidChart) {
      items.push({
        key: 'copy-source',
        label: '复制Mermaid代码',
        onClick: () => {
          if (chartData.mermaidCode) {
            navigator.clipboard.writeText(chartData.mermaidCode);
            message.success('Mermaid代码已复制到剪贴板');
          }
        },
      });
    }
    
    return items;
  };

  // 渲染Mermaid图表
  const RenderMermaidChart = () => {
    if (!chartData.mermaidCode) {
      return <div className="mermaid-error">Mermaid代码为空</div>;
    }

    if (showSource) {
      return (
        <div className="mermaid-source">
          <pre style={{
            background: '#f6f8fa',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            border: '1px solid #e1e4e8'
          }}>
            <code>{chartData.mermaidCode}</code>
          </pre>
        </div>
      );
    }

    // 使用MermaidRenderer渲染Mermaid图表
    return (
      <MermaidRenderer
        code={chartData.mermaidCode}
        title={chartData.title}
        height={height}
        className="chart-mermaid"
      />
    );
  };



  const GetChartOption = () => {
    // 确保图表配置包含必要的默认设置
    return {
      animation: true,
      animationDuration: 750,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      ...chartData.config,
    };
  };

  const GetChartStyle = () => ({
    height: `${height}px`,
    width: '100%',
  });

  return (
    <Card
      className="chart-renderer"
      title={
        <Space>
          <span>{chartData.title}</span>
          {isMermaidChart && (
            <span style={{ fontSize: '12px', color: '#999' }}>
              ({chartData.mermaidType})
            </span>
          )}
        </Space>
      }
      extra={
        showActions && (
          <Space>
            {isMermaidChart && (
              <Button
                type="text"
                icon={showSource ? <EyeOutlined /> : <CodeOutlined />}
                onClick={() => setShowSource(!showSource)}
                title={showSource ? '查看图表' : '查看源码'}
              >
                {showSource ? '图表' : '源码'}
              </Button>
            )}
            {!isMermaidChart && (
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => HandleExport('png')}
            >
              下载
            </Button>
            )}
            <Dropdown
              menu={{ items: GetMenuItems() }}
              placement="bottomRight"
            >
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      }
      bodyStyle={{ padding: '16px' }}
    >
      <div className="chart-container">
        {isMermaidChart ? (
          <RenderMermaidChart />
        ) : (
        <ReactECharts
          ref={chartRef}
          option={GetChartOption()}
          style={GetChartStyle()}
          opts={{
            renderer: 'canvas',
          }}
        />
        )}
      </div>
    </Card>
  );
};

export default ChartRenderer;