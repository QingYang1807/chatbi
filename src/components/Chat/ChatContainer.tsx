// 聊天容器组件

import React, { useEffect, useRef } from 'react';
import { Layout, Empty, Spin } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useChatStore, useDataStore } from '../../stores';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatContainer.css';

const { Content } = Layout;

const ChatContainer: React.FC = () => {
  const { messages, isLoading, LoadChatHistory, SendMessage, ClearChat } = useChatStore();
  const { activeDataset } = useDataStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载聊天历史
    LoadChatHistory();
  }, [LoadChatHistory]);

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <Layout className="chat-container">
      <Content className="chat-content">
        <div ref={containerRef} className="chat-messages-container">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <Empty
                image={<MessageOutlined style={{ fontSize: 64, color: '#1677ff' }} />}
                description={
                  <div className="welcome-content">
                    <h2>欢迎使用 ChatBI</h2>
                    <p>这是一个智能的数据分析对话系统</p>
                    {!activeDataset ? (
                      <div className="welcome-tips">
                        <h3 style={{ color: '#ff7a00' }}>开始使用：</h3>
                        <ul>
                          <li>⚙️ 首先配置AI模型（点击右上角设置按钮）</li>
                          <li>📁 上传您的数据文件（支持 CSV、Excel 格式）</li>
                          <li>📊 在左侧数据集列表中选择要分析的数据</li>
                          <li>💬 使用自然语言描述您想要的分析</li>
                          <li>📈 系统会自动生成图表和洞察</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="welcome-tips">
                        <h3 style={{ color: '#52c41a' }}>数据集已准备就绪！</h3>
                        <p>当前数据集：<strong>{activeDataset.name}</strong></p>
                        <ul>
                          <li>⚙️ 确保已配置AI模型（点击右上角设置按钮）</li>
                          <li>💬 使用自然语言描述您想要的分析</li>
                          <li>📈 系统会自动生成图表和洞察</li>
                          <li>🔄 您可以继续对话来深入分析</li>
                        </ul>
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
          
          {isLoading && (
            <div className="chat-loading">
              <Spin size="small" />
              <span>AI正在思考中...</span>
            </div>
          )}
        </div>
        
        <div className="chat-input-container">
          <MessageInput 
            onSendMessage={SendMessage}
            onClearChat={ClearChat}
            disabled={isLoading}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default ChatContainer;
