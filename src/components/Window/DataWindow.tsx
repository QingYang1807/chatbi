// 数据窗口组件

import React, { useState, useEffect } from 'react';
import { Layout, Empty, Button, Select, Card, Space } from 'antd';
import { 
  DatabaseOutlined, 
  PlusOutlined, 
  AppstoreOutlined,
  BarsOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useDataStore, useUIStore, useWindowStore } from '../../stores';
import { DataWindowData } from '../../types/window';
import DataPreview from '../DataUpload/DataPreview';
// import FileUploader from '../DataUpload/FileUploader';
import DatasetDetails from '../DataUpload/DatasetDetails';
import './DataWindow.css';

const { Content } = Layout;

interface DataWindowProps {
  windowId: string;
}

type ViewMode = 'list' | 'grid' | 'details';

const DataWindow: React.FC<DataWindowProps> = ({ windowId }) => {
  const { GetWindowById, UpdateWindowData } = useWindowStore();
  const { datasets, activeDataset, LoadDatasets } = useDataStore();
  const { ShowDataUploadModal } = useUIStore();
  
  const window = GetWindowById(windowId);
  const windowData = window?.data as DataWindowData;
  
  const [viewMode, setViewMode] = useState<ViewMode>(windowData?.viewMode || 'grid');
  const [selectedDataset, setSelectedDataset] = useState<string | undefined>(
    windowData?.datasetId || (typeof activeDataset === 'string' ? activeDataset : undefined)
  );

  // 同步窗口数据
  useEffect(() => {
    UpdateWindowData(windowId, {
      viewMode,
      datasetId: selectedDataset
    });
  }, [viewMode, selectedDataset, UpdateWindowData, windowId]);

  // 加载数据集
  useEffect(() => {
    LoadDatasets();
  }, [LoadDatasets]);

  const HandleDatasetSelect = (datasetId: string) => {
    setSelectedDataset(datasetId);
    // SetActiveDataset(datasetId);
  };

  const HandleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // const GetViewModeIcon = (mode: ViewMode) => {
  //   switch (mode) {
  //     case 'grid': return <AppstoreOutlined />;
  //     case 'list': return <BarsOutlined />;
  //     case 'details': return <FileTextOutlined />;
  //     default: return <AppstoreOutlined />;
  //   }
  // };

  const RenderEmptyState = () => (
    <div className="data-window-empty">
      <Empty
        image={<DatabaseOutlined style={{ fontSize: 64, color: '#1677ff' }} />}
        description={
          <div className="empty-content">
            <h3>暂无数据集</h3>
            <p>请上传数据文件开始数据分析</p>
          </div>
        }
      >
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={ShowDataUploadModal}
          >
            上传数据
          </Button>
        </Space>
      </Empty>
    </div>
  );

  const RenderDatasetGrid = () => (
    <div className="datasets-grid">
      {datasets.map((dataset) => (
        <Card
          key={dataset.id}
          hoverable
          className={`dataset-card ${selectedDataset === dataset.id ? 'selected' : ''}`}
          onClick={() => HandleDatasetSelect(dataset.id)}
          extra={
            <Button
              type="text"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                HandleViewModeChange('details');
                HandleDatasetSelect(dataset.id);
              }}
            >
              详情
            </Button>
          }
        >
          <DataPreview dataset={dataset} />
        </Card>
      ))}
      
      {/* 添加新数据集卡片 */}
      <Card 
        hoverable 
        className="add-dataset-card"
        onClick={ShowDataUploadModal}
      >
        <div className="add-dataset-content">
          <PlusOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
          <p>上传新数据集</p>
        </div>
      </Card>
    </div>
  );

  const RenderDatasetList = () => (
    <div className="datasets-list">
      {datasets.map((dataset) => (
        <Card
          key={dataset.id}
          size="small"
          className={`dataset-list-item ${selectedDataset === dataset.id ? 'selected' : ''}`}
          onClick={() => HandleDatasetSelect(dataset.id)}
        >
          <div className="dataset-list-content">
            <div className="dataset-info">
              <h4>{dataset.name}</h4>
              <p>{dataset.summary?.totalRows || 0} 行 × {dataset.summary?.totalColumns || 0} 列</p>
            </div>
            <div className="dataset-actions">
              <Button
                type="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  HandleViewModeChange('details');
                  HandleDatasetSelect(dataset.id);
                }}
              >
                查看详情
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      <Button 
        type="dashed" 
        block 
        icon={<PlusOutlined />}
        onClick={ShowDataUploadModal}
        className="add-dataset-btn"
      >
        上传新数据集
      </Button>
    </div>
  );

  const RenderDatasetDetails = () => {
    const dataset = datasets.find(d => d.id === selectedDataset);
    if (!dataset) {
      return (
        <div className="dataset-details-empty">
          <Empty description="请选择要查看的数据集" />
        </div>
      );
    }

    return (
      <div className="dataset-details-container">
        <DatasetDetails 
          dataset={dataset} 
          visible={true}
          onClose={() => {}}
        />
      </div>
    );
  };

  const RenderContent = () => {
    if (datasets.length === 0) {
      return RenderEmptyState();
    }

    switch (viewMode) {
      case 'grid':
        return RenderDatasetGrid();
      case 'list':
        return RenderDatasetList();
      case 'details':
        return RenderDatasetDetails();
      default:
        return RenderDatasetGrid();
    }
  };

  const viewModeOptions = [
    { key: 'grid', label: '网格视图', icon: <AppstoreOutlined /> },
    { key: 'list', label: '列表视图', icon: <BarsOutlined /> },
    { key: 'details', label: '详细视图', icon: <FileTextOutlined /> }
  ];

  return (
    <Layout className="data-window">
      <Content className="data-content">
        {/* 工具栏 */}
        {datasets.length > 0 && (
          <div className="data-toolbar">
            <div className="toolbar-left">
              <span className="dataset-count">
                共 {datasets.length} 个数据集
              </span>
              {selectedDataset && (
                <Select
                  value={selectedDataset}
                  onChange={HandleDatasetSelect}
                  className="dataset-selector"
                  size="small"
                  style={{ minWidth: 150 }}
                >
                  {datasets.map(dataset => (
                    <Select.Option key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </div>
            
            <div className="toolbar-right">
              <Space>
                <Select
                  value={viewMode}
                  onChange={HandleViewModeChange}
                  size="small"
                  style={{ minWidth: 100 }}
                >
                  {viewModeOptions.map(option => (
                    <Select.Option key={option.key} value={option.key}>
                      {option.icon} {option.label}
                    </Select.Option>
                  ))}
                </Select>
                
                <Button 
                  type="primary" 
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={ShowDataUploadModal}
                >
                  上传数据
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="data-content-area">
          {RenderContent()}
        </div>
      </Content>
    </Layout>
  );
};

export default DataWindow;
