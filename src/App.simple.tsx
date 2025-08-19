// 简化版App组件 - 用于调试

import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

const SimpleApp: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          flexDirection: 'column',
          fontSize: '18px',
          color: '#1677ff'
        }}>
          <h1>ChatBI 多窗口系统</h1>
          <p>🎉 应用已成功加载！</p>
          <p>这是简化版本，用于测试基本渲染功能。</p>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default SimpleApp;
