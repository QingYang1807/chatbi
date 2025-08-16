// 主应用程序组件

import React, { useEffect } from 'react';
import { Layout, ConfigProvider, notification, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useSettingsStore, useUIStore, useDataStore, useChatStore } from './stores';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MainContent from './components/Layout/MainContent';
import './App.css';

// 配置dayjs中文语言
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

const App: React.FC = () => {
  const { LoadSettings } = useSettingsStore();
  const { LoadDatasets } = useDataStore();
  const { LoadChatHistory } = useChatStore();
  const { globalLoading, notifications } = useUIStore();
  
  const [notificationApi, contextHolder] = notification.useNotification();

  useEffect(() => {
    // 应用启动时加载所有数据
    const initializeApp = async () => {
      console.log('🚀 开始初始化应用...');
      try {
        await LoadSettings();
        console.log('✅ 设置加载完成');
        
        await LoadDatasets();
        console.log('✅ 数据集加载完成');
        
        await LoadChatHistory();
        console.log('✅ 聊天历史加载完成');
        
        console.log('🎉 应用初始化完成！');
      } catch (error) {
        console.error('❌ 应用初始化失败:', error);
      }
    };

    initializeApp();
  }, [LoadSettings, LoadDatasets, LoadChatHistory]);

  // 处理通知显示
  useEffect(() => {
    notifications.forEach((notif) => {
      const notificationConfig = {
        message: notif.title,
        description: notif.message,
        type: notif.type,
        duration: notif.duration ? notif.duration / 1000 : 4.5,
        key: notif.id,
      };

      // 显示通知
      switch (notif.type) {
        case 'success':
          notificationApi.success(notificationConfig);
          break;
        case 'error':
          notificationApi.error(notificationConfig);
          break;
        case 'warning':
          notificationApi.warning(notificationConfig);
          break;
        case 'info':
        default:
          notificationApi.info(notificationConfig);
          break;
      }
    });
  }, [notifications, notificationApi]);

  if (globalLoading) {
    return (
      <div className="app-loading">
        <Spin size="large" />
        <p>正在加载应用...</p>
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      {contextHolder}
      <Layout className="app-layout">
        <Header />
        <Layout className="app-body">
          <Sidebar />
          <MainContent />
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
