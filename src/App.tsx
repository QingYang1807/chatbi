// 主应用程序组件

import React, { useEffect } from 'react';
import { Layout, ConfigProvider, notification, Spin, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useSettingsStore, useUIStore, useDataStore, useWindowStore, useMultiChatStore } from './stores';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MainContent from './components/Layout/MainContent';
import { GetCurrentTheme } from './utils/themeUtils';
import './App.css';

// 配置dayjs中文语言
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

const App: React.FC = () => {
  const { LoadSettings, uiPreferences } = useSettingsStore();
  const { LoadDatasets } = useDataStore();
  const { LoadLayout } = useWindowStore();
  const { LoadSessions } = useMultiChatStore();
  const { notifications, globalLoading, SetGlobalLoading } = useUIStore();
  
  const [notificationApi, contextHolder] = notification.useNotification();
  
  // 获取当前主题配置
  const currentTheme = GetCurrentTheme(uiPreferences.theme);
  const { defaultAlgorithm, darkAlgorithm } = theme;

  useEffect(() => {
    // 应用启动时加载所有数据
    const initializeApp = async () => {
      console.log('🚀 开始初始化应用...');
      SetGlobalLoading(true);
      
      try {
        // 使用超时机制防止无限加载
        const loadPromises = [
          LoadSettings(),
          LoadDatasets(),
          LoadLayout(),
          LoadSessions()
        ];
        
        // 10秒超时机制
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('初始化超时')), 10000);
        });
        
        await Promise.race([
          Promise.all(loadPromises),
          timeoutPromise
        ]);
        
        console.log('🎉 应用初始化完成！');
      } catch (error) {
        console.error('❌ 应用初始化失败:', error);
      } finally {
        SetGlobalLoading(false);
      }
    };

    initializeApp();
  }, []); // 空依赖数组，只在组件挂载时执行一次

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
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: currentTheme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
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
