// 多窗口聊天管理器 - 专门用于右侧聊天区域

import React, { useEffect } from 'react';
import { Layout, Button, Space, Dropdown } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  LayoutOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useWindowStore, useMultiChatStore } from '../../stores';
import SplitPane from './SplitPane';
import './MultiChatManager.css';

const { Content } = Layout;

const MultiChatManager: React.FC = () => {
  const { 
    layout, 
    CreateWindow, 
    LoadLayout, 
    ResetLayout 
  } = useWindowStore();
  
  const { LoadSessions } = useMultiChatStore();

  // 安全的初始化 - 避免依赖循环
  useEffect(() => {
    const initializeChatManager = async () => {
      try {
        console.log('💬 初始化多窗口聊天管理器...');
        await LoadLayout();
        await LoadSessions();
        console.log('✅ 聊天管理器初始化完成');
        
        // 延迟检查窗口，避免循环
        setTimeout(() => {
          const windowCount = Object.keys(layout.windows).length;
          if (windowCount === 0) {
            console.log('🆕 创建默认聊天窗口...');
            CreateWindow('chat', '欢迎对话');
          }
        }, 100);
      } catch (error) {
        console.error('❌ 初始化聊天管理器失败:', error);
      }
    };

    initializeChatManager();
  }, [LoadLayout, LoadSessions, CreateWindow]);

  const CreateNewWindowMenu = (): MenuProps['items'] => [
    {
      key: 'chat',
      label: '新建对话',
      icon: <MessageOutlined />,
      onClick: () => CreateWindow('chat', '新建对话'),
    }
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
        CreateWindow('chat', '新建对话');
      },
    }
  ];

  const windowCount = Object.keys(layout.windows).length;

  return (
    <div className="multi-chat-manager">
      {/* 聊天工具栏 */}
      <div className="chat-toolbar">
        <div className="toolbar-left">
          <h3 className="toolbar-title">
            <MessageOutlined />
            聊天工作区
          </h3>
          <span className="window-count">{windowCount} 个对话</span>
        </div>
        
        <div className="toolbar-right">
          <Space size="small">
            <Dropdown menu={{ items: CreateNewWindowMenu() }} trigger={['click']}>
              <Button 
                type="primary" 
                size="small"
                icon={<PlusOutlined />}
              >
                新建对话
              </Button>
            </Dropdown>
            
            <Dropdown menu={{ items: LayoutMenu() }} trigger={['click']}>
              <Button 
                size="small"
                icon={<LayoutOutlined />}
              >
                布局
              </Button>
            </Dropdown>
          </Space>
        </div>
      </div>
      
      {/* 聊天内容区域 */}
      <div className="chat-content-area">
        {layout.root ? (
          <SplitPane pane={layout.root} isRoot />
        ) : (
          <div className="chat-empty-state">
            <h3>暂无对话窗口</h3>
            <p>点击"新建对话"开始使用</p>
            <Dropdown menu={{ items: CreateNewWindowMenu() }} trigger={['click']}>
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                新建对话
              </Button>
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiChatManager;
