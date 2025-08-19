// 安全的窗口管理器 - 无循环依赖

import React from 'react';
import { Layout, Button, Space, Card, Tabs } from 'antd';
import { PlusOutlined, LayoutOutlined } from '@ant-design/icons';
import { useWindowStore } from '../../stores';
import SafeChatWindow from './SafeChatWindow';
import './WindowManager.css';

const { Header, Content } = Layout;

const SafeWindowManager: React.FC = () => {
  const { 
    layout, 
    CreateWindow, 
    ActivateWindow 
  } = useWindowStore();

  // 不使用useEffect，避免所有依赖循环问题

  const handleCreateWindow = () => {
    try {
      const windowId = CreateWindow('chat', '新建对话');
      console.log('✅ 创建窗口成功:', windowId);
    } catch (error) {
      console.error('❌ 创建窗口失败:', error);
    }
  };

  const windowCount = Object.keys(layout.windows).length;
  const windows = Object.values(layout.windows);

  const renderContent = () => {
    if (windowCount === 0) {
      return (
        <div className="window-manager-empty">
          <h3>暂无窗口</h3>
          <p>点击按钮创建第一个窗口</p>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleCreateWindow}>
            创建聊天窗口
          </Button>
        </div>
      );
    }

    return (
      <div style={{ height: '100%', padding: '16px' }}>
        <Tabs
          activeKey={layout.root?.activeTabId}
          onChange={(key) => {
            console.log('切换到窗口:', key);
            ActivateWindow(key);
          }}
          type="editable-card"
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              handleCreateWindow();
            }
          }}
        >
          {windows.map(window => (
            <Tabs.TabPane tab={window.title} key={window.id}>
              <Card title={`窗口: ${window.title}`}>
                <div style={{ marginBottom: '16px' }}>
                  <p><strong>ID:</strong> {window.id}</p>
                  <p><strong>类型:</strong> {window.type}</p>
                  <p><strong>激活状态:</strong> {window.isActive ? '是' : '否'}</p>
                </div>
                
                {window.type === 'chat' && (
                  <div style={{ height: '500px', border: '1px solid #e8e8e8', borderRadius: '6px', overflow: 'hidden' }}>
                    <SafeChatWindow windowId={window.id} />
                  </div>
                )}
              </Card>
            </Tabs.TabPane>
          ))}
        </Tabs>
      </div>
    );
  };

  return (
    <Layout className="window-manager">
      <Header className="window-manager-header">
        <div className="header-left">
          <h2 className="window-manager-title">
            <LayoutOutlined />
            安全版工作台
          </h2>
          <span className="window-count">{windowCount} 个窗口</span>
        </div>
        
        <div className="header-right">
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateWindow}
            >
              新建窗口
            </Button>
            <Button 
              onClick={() => {
                console.log('=== 当前状态 ===');
                console.log('布局:', layout);
                console.log('窗口数量:', windowCount);
                console.log('窗口列表:', windows);
              }}
            >
              调试信息
            </Button>
          </Space>
        </div>
      </Header>
      
      <Content className="window-manager-content">
        {renderContent()}
      </Content>
    </Layout>
  );
};

export default SafeWindowManager;
