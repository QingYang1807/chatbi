// 数据预览组件

import React, { useState, useMemo } from 'react';
import { Table, Card, Space, Tag, Statistic, Row, Col, Button, Tooltip, Popconfirm, message, Select, Divider } from 'antd';
import { EyeOutlined, DeleteOutlined, DownloadOutlined, InfoCircleOutlined, FileExcelOutlined, SwapOutlined } from '@ant-design/icons';
import { DataSet, ColumnInfo } from '../../types';
import { useDataStore } from '../../stores';
import DataSummary from './DataSummary';
import DatasetDetails from './DatasetDetails';
import './DataPreview.css';

interface DataPreviewProps {
  dataset: DataSet;
  height?: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ dataset, height = 400 }) => {
  const { SelectDataset, DeleteDataset, activeDataset, SwitchSheet, GetSheetNames } = useDataStore();
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetails, setShowDetails] = useState(false);

  const isActive = activeDataset?.id === dataset.id;
  const sheetNames = GetSheetNames(dataset.id);
  const hasMultipleSheets = dataset.sheets && dataset.sheets.length > 1;

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

  const HandleDelete = async () => {
    try {
      await DeleteDataset(dataset.id);
      message.success(`数据集 "${dataset.name}" 已删除`);
    } catch (error) {
      console.error('删除数据集失败:', error);
      message.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const HandleSheetChange = async (sheetIndex: number) => {
    try {
      console.log('🔄 用户切换工作表:', sheetIndex);
      await SwitchSheet(dataset.id, sheetIndex);
      message.success(`已切换到工作表 "${sheetNames[sheetIndex]}"`);
    } catch (error) {
      console.error('切换工作表失败:', error);
      message.error('切换工作表失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
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
            {hasMultipleSheets && (
              <>
                <Divider type="vertical" />
                <FileExcelOutlined style={{ color: '#1677ff' }} />
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {dataset.sheets!.length} 个工作表
                </span>
              </>
            )}
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
              icon={<InfoCircleOutlined />}
              onClick={() => setShowDetails(true)}
            >
              详情
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={HandleDownload}
            >
              导出
            </Button>
            <Popconfirm
              title="确认删除数据集？"
              description={
                <div>
                  <p>数据集名称：{dataset.name}</p>
                  <p>包含数据：{dataset.summary.totalRows} 行 {dataset.summary.totalColumns} 列</p>
                  <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>删除后无法恢复，请谨慎操作！</p>
                </div>
              }
              onConfirm={HandleDelete}
              okText="确认删除"
              cancelText="取消"
              okType="danger"
            >
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        {/* 工作表选择器 */}
        {hasMultipleSheets && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f8f9fa' }}>
            <Row align="middle" gutter={16}>
              <Col>
                <Space>
                  <SwapOutlined style={{ color: '#1677ff' }} />
                  <span style={{ fontWeight: 500 }}>工作表选择：</span>
                </Space>
              </Col>
              <Col flex="auto">
                <Select
                  value={dataset.activeSheetIndex || 0}
                  onChange={HandleSheetChange}
                  style={{ width: '200px' }}
                  size="small"
                >
                  {sheetNames.map((sheetName, index) => (
                    <Select.Option key={index} value={index}>
                      <Space>
                        <FileExcelOutlined style={{ color: '#1677ff' }} />
                        {sheetName}
                        {index === (dataset.activeSheetIndex || 0) && (
                          <Tag color="blue">当前</Tag>
                        )}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col>
                <Tooltip title="当前工作表信息">
                  <Space size="small" style={{ color: '#666', fontSize: '12px' }}>
                    <span>第 {(dataset.activeSheetIndex || 0) + 1} 页</span>
                    <span>共 {sheetNames.length} 页</span>
                  </Space>
                </Tooltip>
              </Col>
            </Row>
          </Card>
        )}
        
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
        
        {/* 当前工作表信息（仅多工作表时显示） */}
        {hasMultipleSheets && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card size="small">
                <Space>
                  <FileExcelOutlined style={{ color: '#1677ff' }} />
                  <span style={{ fontWeight: 500 }}>
                    当前工作表: {sheetNames[dataset.activeSheetIndex || 0]}
                  </span>
                  <Divider type="vertical" />
                  <span style={{ color: '#666' }}>
                    {dataset.summary.totalRows} 行数据
                  </span>
                  <Divider type="vertical" />
                  <span style={{ color: '#666' }}>
                    {dataset.summary.totalColumns} 列字段
                  </span>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

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

      {/* 数据集详情弹窗 */}
      <DatasetDetails
        visible={showDetails}
        dataset={dataset}
        onClose={() => setShowDetails(false)}
        onUpdate={(updatedDataset) => {
          // 这里可以更新本地数据集信息
          console.log('数据集更新:', updatedDataset);
        }}
        onDelete={() => {
          // 删除后关闭弹窗
          setShowDetails(false);
        }}
      />
    </div>
  );
};

export default DataPreview;
