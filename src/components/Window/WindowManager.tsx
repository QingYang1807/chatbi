// 窗口管理器 - 主要的窗口布局管理组件

import React, { useEffect } from 'react';
import { Layout, Button, Space, Dropdown } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  DatabaseOutlined,
  BarChartOutlined,
  LayoutOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useWindowStore, useMultiChatStore } from '../../stores';
import SplitPane from './SplitPane';
import './WindowManager.css';

const { Header, Content } = Layout;

const WindowManager: React.FC = () => {
  const { 
    layout, 
    CreateWindow, 
    LoadLayout, 
    ResetLayout 
  } = useWindowStore();
  
  const { LoadSessions } = useMultiChatStore();

  // 安全的初始化 - 避免依赖循环
  useEffect(() => {
    const initializeWindowManager = async () => {
      try {
        console.log('🪟 初始化WindowManager...');
        await LoadLayout();
        await LoadSessions();
        console.log('✅ WindowManager初始化完成');
        
        // 延迟检查窗口，避免循环
        setTimeout(() => {
          const windowCount = Object.keys(layout.windows).length;
          if (windowCount === 0) {
            console.log('🆕 创建默认窗口...');
            CreateWindow('chat', '欢迎');
          }
        }, 100);
      } catch (error) {
        console.error('❌ 初始化窗口管理器失败:', error);
      }
    };

    initializeWindowManager();
  }, [LoadLayout, LoadSessions, CreateWindow]); // 保持简单的依赖

  const CreateNewWindowMenu = (): MenuProps['items'] => [
    {
      key: 'chat',
      label: '新建对话',
      icon: <MessageOutlined />,
      onClick: () => CreateWindow('chat', '新建对话'),
    },
    {
      key: 'data',
      label: '数据视图',
      icon: <DatabaseOutlined />,
      onClick: () => CreateWindow('data', '数据视图'),
    },
    {
      key: 'visualization',
      label: '图表视图',
      icon: <BarChartOutlined />,
      onClick: () => CreateWindow('visualization', '图表视图'),
    },
  ];

  const LayoutMenu = (): MenuProps['items'] => [
    {
      key: 'reset',
      label: '重置布局',
      icon: <ReloadOutlined />,
      onClick: () => {
        ResetLayout();
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'horizontal-split',
      label: '水平分屏',
      onClick: () => {
        // TODO: 实现预设布局
        console.log('水平分屏布局');
      },
    },
    {
      key: 'vertical-split',
      label: '垂直分屏',
      onClick: () => {
        // TODO: 实现预设布局
        console.log('垂直分屏布局');
      },
    },
  ];

  const windowCount = Object.keys(layout.windows).length;

  return (
    <Layout className="window-manager">
      <Header className="window-manager-header">
        <div className="header-left">
          <h2 className="window-manager-title">
            <LayoutOutlined />
            ChatBI 工作台
          </h2>
          <span className="window-count">
            {windowCount} 个窗口
          </span>
        </div>
        
        <div className="header-right">
          <Space>
            <Dropdown menu={{ items: CreateNewWindowMenu() }} trigger={['click']}>
              <Button type="primary" icon={<PlusOutlined />}>
                新建窗口
              </Button>
            </Dropdown>
            
            <Dropdown menu={{ items: LayoutMenu() }} trigger={['click']}>
              <Button icon={<LayoutOutlined />}>
                布局
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>
      
      <Content className="window-manager-content">
        {layout.root ? (
          <SplitPane pane={layout.root} isRoot />
        ) : (
          <div className="window-manager-empty">
            <h3>暂无窗口</h3>
            <p>点击"新建窗口"开始使用</p>
            <Dropdown menu={{ items: CreateNewWindowMenu() }} trigger={['click']}>
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                新建窗口
              </Button>
            </Dropdown>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default WindowManager;
