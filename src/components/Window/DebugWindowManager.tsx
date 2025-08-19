// 调试版窗口管理器 - 测试WindowStore

import React, { useEffect } from 'react';
import { Layout, Button, Space, Card } from 'antd';
import { PlusOutlined, LayoutOutlined, MessageOutlined } from '@ant-design/icons';
import { useWindowStore } from '../../stores';
import './WindowManager.css';

const { Header, Content } = Layout;

const DebugWindowManager: React.FC = () => {
  const { 
    layout, 
    CreateWindow, 
    LoadLayout
  } = useWindowStore();

  // 简化的初始化逻辑
  useEffect(() => {
    const initializeDebug = async () => {
      try {
        console.log('🔧 开始调试WindowStore...');
        await LoadLayout();
        console.log('✅ LoadLayout完成，当前layout:', layout);
      } catch (error) {
        console.error('❌ LoadLayout失败:', error);
      }
    };

    initializeDebug();
  }, [LoadLayout]);

  const handleCreateWindow = () => {
    try {
      console.log('🆕 创建新窗口...');
      const windowId = CreateWindow('chat', '测试窗口');
      console.log('✅ 窗口创建成功:', windowId);
      console.log('📊 当前layout状态:', layout);
    } catch (error) {
      console.error('❌ 创建窗口失败:', error);
    }
  };

  const windowCount = Object.keys(layout.windows).length;

  return (
    <Layout className="window-manager">
      <Header className="window-manager-header">
        <div className="header-left">
          <h2 className="window-manager-title">
            <LayoutOutlined />
            ChatBI 工作台 (调试版)
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
              创建测试窗口
            </Button>
            <Button 
              onClick={() => console.log('当前WindowStore状态:', { layout })}
            >
              打印状态
            </Button>
          </Space>
        </div>
      </Header>
      
      <Content className="window-manager-content">
        <div style={{ padding: '20px' }}>
          <h3>WindowStore调试信息</h3>
          
          <Card title="布局状态" style={{ marginBottom: '16px' }}>
            <p><strong>窗口数量:</strong> {windowCount}</p>
            <p><strong>根面板ID:</strong> {layout.root?.id || '无'}</p>
            <p><strong>根面板类型:</strong> {layout.root?.type || '无'}</p>
            <p><strong>子元素数量:</strong> {layout.root?.children?.length || 0}</p>
          </Card>

          <Card title="窗口列表" style={{ marginBottom: '16px' }}>
            {windowCount === 0 ? (
              <p>暂无窗口</p>
            ) : (
              <div>
                {Object.values(layout.windows).map(window => (
                  <div key={window.id} style={{ 
                    padding: '8px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px', 
                    marginBottom: '8px' 
                  }}>
                    <p><strong>ID:</strong> {window.id}</p>
                    <p><strong>标题:</strong> {window.title}</p>
                    <p><strong>类型:</strong> {window.type}</p>
                    <p><strong>激活:</strong> {window.isActive ? '是' : '否'}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="操作测试">
            <Space>
              <Button icon={<MessageOutlined />} onClick={handleCreateWindow}>
                创建聊天窗口
              </Button>
              <Button 
                onClick={() => {
                  console.log('=== WindowStore完整状态 ===');
                  console.log('layout:', layout);
                  console.log('windows:', layout.windows);
                  console.log('root:', layout.root);
                }}
              >
                详细日志
              </Button>
            </Space>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default DebugWindowManager;
