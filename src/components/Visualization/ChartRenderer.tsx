// 图表渲染组件

import React, { useRef, useEffect } from 'react';
import { Card, Button, Space, Dropdown, message } from 'antd';
import { DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { ChartData, ChartExportOptions } from '../../types';
import { chartService } from '../../services/chartService';
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

  useEffect(() => {
    // 图表渲染完成后的处理
    if (chartRef.current) {
      const chartInstance = chartRef.current.getEchartsInstance();
      
      // 添加图表点击事件
      chartInstance.on('click', (params: any) => {
        console.log('图表点击事件:', params);
        // 可以在这里添加图表交互逻辑
      });
    }
  }, [chartData]);

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

  const GetMenuItems = () => [
    {
      key: 'export-png',
      label: '导出为 PNG',
      onClick: () => HandleExport('png'),
    },
    {
      key: 'export-svg',
      label: '导出为 SVG',
      onClick: () => HandleExport('svg'),
    },
  ];

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
      title={chartData.title}
      extra={
        showActions && (
          <Space>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => HandleExport('png')}
            >
              下载
            </Button>
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
        <ReactECharts
          ref={chartRef}
          option={GetChartOption()}
          style={GetChartStyle()}
          opts={{
            renderer: 'canvas',
          }}
        />
      </div>
    </Card>
  );
};

export default ChartRenderer;