// 测试SplitPane组件的WindowManager

import React, { useEffect } from 'react';
import { Layout, Button, Space, Card, Tabs } from 'antd';
import { PlusOutlined, LayoutOutlined } from '@ant-design/icons';
import { useWindowStore } from '../../stores';
import './WindowManager.css';

const { Header, Content } = Layout;
const { TabPane } = Tabs;

const TestSplitPaneManager: React.FC = () => {
  const { 
    layout, 
    CreateWindow, 
    LoadLayout,
    ActivateWindow 
  } = useWindowStore();

  // 初始化 - 修复依赖循环
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🧪 测试SplitPane渲染...');
        await LoadLayout();
        console.log('✅ SplitPane测试初始化完成');
      } catch (error) {
        console.error('❌ SplitPane测试初始化失败:', error);
      }
    };

    initialize();
  }, [LoadLayout]); // 移除了CreateWindow和layout.windows避免循环

  // 暂时注释掉自动创建默认窗口，避免循环
  // useEffect(() => {
  //   const windowCount = Object.keys(layout.windows).length;
  //   if (windowCount === 0) {
  //     console.log('🆕 创建默认窗口...');
  //     CreateWindow('chat', '欢迎');
  //   }
  // }, [CreateWindow]);

  const handleCreateWindow = () => {
    CreateWindow('chat', '新建对话');
  };

  const windowCount = Object.keys(layout.windows).length;

  // 简化的Tab渲染 - 不使用SplitPane
  const renderSimpleTabs = () => {
    const windows = Object.values(layout.windows);
    const activeWindowId = layout.root?.activeTabId;

    if (windows.length === 0) {
      return (
        <div className="window-manager-empty">
          <h3>暂无窗口</h3>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateWindow}>
            创建窗口
          </Button>
        </div>
      );
    }

    return (
      <div style={{ height: '100%', padding: '16px' }}>
        <Tabs
          activeKey={activeWindowId}
          onChange={ActivateWindow}
          type="editable-card"
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              handleCreateWindow();
            }
          }}
        >
          {windows.map(window => (
            <TabPane tab={window.title} key={window.id}>
              <Card>
                <h3>窗口: {window.title}</h3>
                <p><strong>ID:</strong> {window.id}</p>
                <p><strong>类型:</strong> {window.type}</p>
                <p><strong>激活状态:</strong> {window.isActive ? '是' : '否'}</p>
                
                {window.type === 'chat' && (
                  <div style={{ 
                    border: '1px dashed #d9d9d9', 
                    padding: '20px', 
                    textAlign: 'center',
                    marginTop: '16px' 
                  }}>
                    <h4>聊天窗口内容区域</h4>
                    <p>这里将是ChatWindow组件</p>
                    <p>窗口ID: {window.id}</p>
                  </div>
                )}
              </Card>
            </TabPane>
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
            SplitPane测试版
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
            <Button onClick={() => console.log('当前布局:', layout)}>
              打印布局
            </Button>
          </Space>
        </div>
      </Header>
      
      <Content className="window-manager-content">
        {renderSimpleTabs()}
      </Content>
    </Layout>
  );
};

export default TestSplitPaneManager;
