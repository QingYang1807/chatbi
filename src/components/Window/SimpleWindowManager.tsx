// 简化的窗口管理器 - 用于调试

import React from 'react';
import { Layout, Button } from 'antd';
import { PlusOutlined, LayoutOutlined } from '@ant-design/icons';
import './WindowManager.css';

const { Header, Content } = Layout;

const SimpleWindowManager: React.FC = () => {
  return (
    <Layout className="window-manager">
      <Header className="window-manager-header">
        <div className="header-left">
          <h2 className="window-manager-title">
            <LayoutOutlined />
            ChatBI 工作台 (简化版)
          </h2>
          <span className="window-count">0 个窗口</span>
        </div>
        
        <div className="header-right">
          <Button type="primary" icon={<PlusOutlined />}>
            新建窗口
          </Button>
          <Button icon={<LayoutOutlined />}>
            布局
          </Button>
        </div>
      </Header>
      
      <Content className="window-manager-content">
        <div className="window-manager-empty">
          <h3>简化的窗口管理器</h3>
          <p>这是用于调试的简化版本</p>
          <p>所有基本UI元素都应该正常显示</p>
        </div>
      </Content>
    </Layout>
  );
};

export default SimpleWindowManager;
