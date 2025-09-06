// 侧边栏导航组件

import React from 'react';
import { Layout, Menu, Space, Typography, Card, Button, Popconfirm, message } from 'antd';
import { 
  MessageOutlined, 
  UploadOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useUIStore, useDataStore } from '../../stores';
import './Sidebar.css';

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar: React.FC = () => {
  const { 
    sidebarCollapsed, 
    activePage, 
    SetActivePage,
    ShowDataUploadModal 
  } = useUIStore();
  
  const { datasets, activeDataset, DeleteDataset, SelectDataset } = useDataStore();

  const menuItems = [
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: '对话分析',
    },
    {
      key: 'test',
      icon: <ExperimentOutlined />,
      label: 'Mermaid测试',
    },
  ];

  const HandleMenuClick = (e: any) => {
    SetActivePage(e.key);
  };

  const HandleUploadClick = () => {
    ShowDataUploadModal();
  };

  const HandleDatasetClick = (datasetId: string) => {
    SelectDataset(datasetId);
  };

  const HandleDeleteDataset = async (datasetId: string, datasetName: string) => {
    try {
      await DeleteDataset(datasetId);
      message.success(`数据集 "${datasetName}" 已删除`);
    } catch (error) {
      console.error('删除数据集失败:', error);
      message.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={sidebarCollapsed}
      className="app-sidebar"
      width={280}
      collapsedWidth={80}
    >
      <div className="sidebar-content">
        {/* 主导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[activePage]}
          onClick={HandleMenuClick}
          className="sidebar-menu"
          items={menuItems}
        />

        {!sidebarCollapsed && (
          <>
            {/* 快速上传 */}
            <div className="sidebar-section">
              <div className="section-header">
                <Text strong>快速操作</Text>
              </div>
              <Button
                type="dashed"
                icon={<UploadOutlined />}
                onClick={HandleUploadClick}
                block
                style={{ marginBottom: 8 }}
              >
                上传数据
              </Button>
            </div>

            {/* 数据集列表 */}
            <div className="sidebar-section">
              <div className="section-header">
                <Space>
                  <Text strong>数据集</Text>
                  <Text type="secondary">({datasets.length})</Text>
                </Space>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={HandleUploadClick}
                  title="添加数据集"
                />
              </div>

              <div className="datasets-list">
                {datasets.length === 0 ? (
                  <div className="empty-datasets">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      暂无数据集
                    </Text>
                  </div>
                ) : (
                  datasets.map((dataset) => (
                    <Card
                      key={dataset.id}
                      size="small"
                      className={`dataset-item ${
                        activeDataset?.id === dataset.id ? 'active' : ''
                      }`}
                      bodyStyle={{ padding: '8px 12px' }}
                      onClick={() => HandleDatasetClick(dataset.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="dataset-header">
                        <FileTextOutlined style={{ color: '#1677ff' }} />
                        <Text
                          strong
                          ellipsis
                          style={{ 
                            flex: 1, 
                            fontSize: 12,
                            color: activeDataset?.id === dataset.id ? '#1677ff' : undefined
                          }}
                        >
                          {dataset.name}
                        </Text>
                      </div>
                      <div className="dataset-meta">
                        <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dataset.summary.totalRows} 行 · {dataset.summary.totalColumns} 列
                          </Text>
                          <Popconfirm
                            title="确认删除数据集？"
                            description={
                              <div>
                                <p>数据集名称：{dataset.name}</p>
                                <p>包含数据：{dataset.summary.totalRows} 行 {dataset.summary.totalColumns} 列</p>
                                <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>删除后无法恢复，请谨慎操作！</p>
                              </div>
                            }
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              HandleDeleteDataset(dataset.id, dataset.name);
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                            okText="确认删除"
                            cancelText="取消"
                            okType="danger"
                            placement="topRight"
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                color: '#ff4d4f',
                                opacity: 0.7,
                                minWidth: '20px',
                                height: '20px',
                                padding: '0 4px'
                              }}
                              className="dataset-delete-btn"
                            />
                          </Popconfirm>
                        </Space>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* 使用提示 */}
            <div className="sidebar-section">
              <Card size="small" className="tip-card">
                <div className="tip-content">
                  <Text style={{ fontSize: 11, color: '#666' }}>
                    💡 上传数据后，在对话中询问关于数据的问题，AI会为您分析并生成图表
                  </Text>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;
