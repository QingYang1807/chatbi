// 顶部导航组件

import React from 'react';
import { Layout, Button, Space, Typography, Avatar, Dropdown, Badge } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  SettingOutlined, 
  UserOutlined,
  BellOutlined,
  GithubOutlined
} from '@ant-design/icons';
import { useUIStore, useSettingsStore } from '../../stores';
import './Header.css';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

const Header: React.FC = () => {
  const { 
    sidebarCollapsed, 
    ToggleSidebar, 
    ShowSettingsModal,
    notifications,
    ClearNotifications
  } = useUIStore();
  
  const { modelConfig, apiKeyValid } = useSettingsStore();

  const userMenuItems = [
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: ShowSettingsModal,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'github',
      label: (
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      ),
      icon: <GithubOutlined />,
    },
  ];

  const notificationMenuItems = [
    ...notifications.slice(0, 5).map(notification => ({
      key: notification.id,
      label: (
        <div className="notification-item">
          <div className="notification-title">{notification.title}</div>
          {notification.message && (
            <div className="notification-message">{notification.message}</div>
          )}
          <div className="notification-time">
            {notification.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ),
    })),
    ...(notifications.length > 0 ? [
      {
        type: 'divider' as const,
      },
      {
        key: 'clear',
        label: '清除所有通知',
        onClick: ClearNotifications,
      },
    ] : []),
  ];

  if (notifications.length === 0) {
    notificationMenuItems.push({
      key: 'empty',
      label: '暂无通知',
      onClick: () => {},
    });
  }

  const GetConnectionStatus = () => {
    if (!modelConfig.apiKey) {
      return { color: 'default', text: '未配置' };
    }
    if (apiKeyValid) {
      return { color: 'success', text: '已连接' };
    }
    return { color: 'error', text: '连接失败' };
  };

  const connectionStatus = GetConnectionStatus();

  return (
    <AntHeader className="app-header">
      <div className="header-left">
        <Button
          type="text"
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={ToggleSidebar}
          className="sidebar-trigger"
        />
        
        <div className="header-title">
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            ChatBI MVP
          </Title>
          <span className="header-subtitle">对话式商业智能</span>
        </div>
      </div>

      <div className="header-right">
        <Space size="middle">
          {/* 连接状态 */}
          <div className="connection-status">
            <div className={`status-dot status-${connectionStatus.color}`} />
            <span className="status-text">{connectionStatus.text}</span>
          </div>

          {/* 通知 */}
          <Dropdown
            menu={{ items: notificationMenuItems }}
            trigger={['click']}
            placement="bottomRight"
            arrow
          >
            <Button
              type="text"
              icon={
                <Badge count={notifications.length} size="small">
                  <BellOutlined style={{ color: '#fff' }} />
                </Badge>
              }
              className="header-button"
            />
          </Dropdown>

          {/* 用户菜单 */}
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
            arrow
          >
            <Button
              type="text"
              icon={<Avatar size="small" icon={<UserOutlined />} />}
              className="header-button"
            />
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;
