// 侧边栏导航组件

import React from 'react';
import { Layout, Menu, Space, Typography, Card, Button } from 'antd';
import { 
  MessageOutlined, 
  DatabaseOutlined, 
  BarChartOutlined, 
  UploadOutlined,
  FileTextOutlined,
  PlusOutlined
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
  
  const { datasets, activeDataset } = useDataStore();

  const menuItems = [
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: '对话分析',
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: '数据管理',
    },
    {
      key: 'charts',
      icon: <BarChartOutlined />,
      label: '图表生成',
    },
  ];

  const HandleMenuClick = (e: any) => {
    SetActivePage(e.key);
  };

  const HandleUploadClick = () => {
    ShowDataUploadModal();
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
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {dataset.summary.totalRows} 行 · {dataset.summary.totalColumns} 列
                        </Text>
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
