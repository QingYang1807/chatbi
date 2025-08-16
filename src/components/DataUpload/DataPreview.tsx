// 数据预览组件

import React, { useState, useMemo } from 'react';
import { Table, Card, Space, Tag, Statistic, Row, Col, Button, Tooltip } from 'antd';
import { EyeOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { DataSet, ColumnInfo } from '../../types';
import { useDataStore } from '../../stores';
import DataSummary from './DataSummary';
import './DataPreview.css';

interface DataPreviewProps {
  dataset: DataSet;
  height?: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ dataset, height = 400 }) => {
  const { SelectDataset, DeleteDataset, activeDataset } = useDataStore();
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const isActive = activeDataset?.id === dataset.id;

  // 生成表格列配置
  const columns = useMemo(() => {
    return dataset.columns.map((col: ColumnInfo) => ({
      title: (
        <Space>
          <span>{col.name}</span>
          <Tag color={GetColumnTypeColor(col.type)}>
            {GetColumnTypeName(col.type)}
          </Tag>
        </Space>
      ),
      dataIndex: col.name,
      key: col.name,
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (value: any) => (
        <Tooltip placement="topLeft" title={value}>
          {RenderCellValue(value, col.type)}
        </Tooltip>
      ),
    }));
  }, [dataset.columns]);

  const GetColumnTypeColor = (type: string) => {
    switch (type) {
      case 'number': return 'blue';
      case 'date': return 'green';
      case 'boolean': return 'orange';
      default: return 'default';
    }
  };

  const GetColumnTypeName = (type: string) => {
    switch (type) {
      case 'number': return '数值';
      case 'date': return '日期';
      case 'boolean': return '布尔';
      default: return '文本';
    }
  };

  const RenderCellValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <span style={{ color: '#ccc' }}>-</span>;
    }

    switch (type) {
      case 'number':
        return <span style={{ color: '#1677ff' }}>{Number(value).toLocaleString()}</span>;
      case 'date':
        return <span style={{ color: '#52c41a' }}>{new Date(value).toLocaleDateString()}</span>;
      case 'boolean':
        return <Tag color={value ? 'success' : 'default'}>{value ? '是' : '否'}</Tag>;
      default:
        return <span>{String(value)}</span>;
    }
  };

  const HandleSelect = () => {
    SelectDataset(dataset.id);
  };

  const HandleDelete = () => {
    DeleteDataset(dataset.id);
  };

  const HandleDownload = () => {
    // 导出数据逻辑
    const csvContent = [
      dataset.columns.map(col => col.name).join(','),
      ...dataset.rows.map(row => 
        dataset.columns.map(col => row[col.name] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataset.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return dataset.rows.slice(startIndex, endIndex).map((row, index) => ({
      ...row,
      key: startIndex + index,
    }));
  }, [dataset.rows, currentPage, pageSize]);

  return (
    <div className="data-preview">
      <Card
        className={`preview-card ${isActive ? 'active' : ''}`}
        title={
          <Space>
            <span>{dataset.name}</span>
            {isActive && <Tag color="success">当前数据集</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button
              type={isActive ? 'default' : 'primary'}
              size="small"
              icon={<EyeOutlined />}
              onClick={HandleSelect}
              disabled={isActive}
            >
              {isActive ? '已选择' : '选择'}
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={HandleDownload}
            >
              导出
            </Button>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={HandleDelete}
            >
              删除
            </Button>
          </Space>
        }
      >
        {/* 数据概览 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="总行数" value={dataset.summary.totalRows} />
          </Col>
          <Col span={6}>
            <Statistic title="总列数" value={dataset.summary.totalColumns} />
          </Col>
          <Col span={6}>
            <Statistic title="数值列" value={dataset.summary.numericColumns} />
          </Col>
          <Col span={6}>
            <Statistic title="文本列" value={dataset.summary.stringColumns} />
          </Col>
        </Row>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={paginatedData}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: dataset.rows.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
          scroll={{ x: 'max-content', y: height }}
          size="small"
          bordered
        />

        {/* 数据统计详情 */}
        <DataSummary dataset={dataset} />
      </Card>
    </div>
  );
};

export default DataPreview;
