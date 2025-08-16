// 聊天容器组件

import React, { useEffect, useRef } from 'react';
import { Layout, Empty, Spin } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useChatStore } from '../../stores';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatContainer.css';

const { Content } = Layout;

const ChatContainer: React.FC = () => {
  const { messages, isLoading, LoadChatHistory } = useChatStore();
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
                    <div className="welcome-tips">
                      <h3>使用建议：</h3>
                      <ul>
                        <li>• 首先上传您的数据文件（支持 CSV、Excel 格式）</li>
                        <li>• 使用自然语言描述您想要的分析</li>
                        <li>• 系统会自动生成图表和洞察</li>
                        <li>• 您可以继续对话来深入分析</li>
                      </ul>
                    </div>
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
          <MessageInput />
        </div>
      </Content>
    </Layout>
  );
};

export default ChatContainer;
