// 聊天窗口组件

import React, { useEffect, useRef } from 'react';
import { Layout, Empty, Spin, Button, Select } from 'antd';
import { MessageOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useMultiChatStore, useDataStore, useWindowStore } from '../../stores';
import { ChatWindowData } from '../../types/window';
import MessageList from '../Chat/MessageList';
import MessageInput from '../Chat/MessageInput';
import './ChatWindow.css';

const { Content } = Layout;

interface ChatWindowProps {
  windowId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ windowId }) => {
  const { GetWindowById, UpdateWindowData } = useWindowStore();
  const { datasets, activeDataset } = useDataStore();
  const {
    GetSession,
    GetSessionMessages,
    GetSessionLoading,
    GetSessionError,
    CreateSession,
    SendMessage,
    ClearSession,
    SetSessionDataset,
    RetryLastMessage,
    LoadSessions
  } = useMultiChatStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const window = GetWindowById(windowId);
  const windowData = window?.data as ChatWindowData;
  const sessionId = windowData?.sessionId;

  // 如果没有会话ID，创建一个新会话
  useEffect(() => {
    if (!sessionId) {
      const newSessionId = CreateSession(window?.title || '新建对话', windowData?.datasetId);
      UpdateWindowData(windowId, { sessionId: newSessionId });
    }
  }, [sessionId, CreateSession, UpdateWindowData, windowId, window?.title, windowData?.datasetId]);

  // 加载会话
  useEffect(() => {
    LoadSessions();
  }, [LoadSessions]);

  const session = sessionId ? GetSession(sessionId) : undefined;
  const messages = sessionId ? GetSessionMessages(sessionId) : [];
  const isLoading = sessionId ? GetSessionLoading(sessionId) : false;
  const error = sessionId ? GetSessionError(sessionId) : undefined;
  const sessionDataset = session?.currentDataset;

  // 监听数据存储变化，自动选择新上传的数据集
  useEffect(() => {
    if (sessionId && activeDataset && !sessionDataset) {
      // 如果当前会话没有选择数据集，且有新的活动数据集，则自动选择
      console.log('🎯 自动选择新上传的数据集:', activeDataset.id);
      SetSessionDataset(sessionId, activeDataset.id);
      UpdateWindowData(windowId, { datasetId: activeDataset.id });
    }
  }, [sessionId, activeDataset, sessionDataset, SetSessionDataset, UpdateWindowData, windowId]);

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const HandleSendMessage = async (content: string) => {
    if (!sessionId) return;
    await SendMessage(sessionId, content);
  };

  const HandleClearChat = () => {
    if (!sessionId) return;
    ClearSession(sessionId);
  };

  const HandleRetry = () => {
    if (!sessionId) return;
    RetryLastMessage(sessionId);
  };

  const HandleDatasetChange = (datasetId: string) => {
    if (sessionId) {
      SetSessionDataset(sessionId, datasetId);
    }
    UpdateWindowData(windowId, { datasetId });
  };

  const RenderEmptyState = () => (
    <div className="chat-welcome">
      <Empty
        image={<MessageOutlined style={{ fontSize: 64, color: '#1677ff' }} />}
        description={
          <div className="welcome-content">
            <h2>欢迎使用 ChatBI</h2>
            <p>这是一个智能的数据分析对话系统</p>
            {!sessionDataset ? (
              <div className="welcome-tips">
                <h3 style={{ color: '#ff7a00' }}>开始使用：</h3>
                <ul>
                  <li>首先上传您的数据文件（支持 CSV、Excel 格式）</li>
                  <li>在左侧数据集列表中选择要分析的数据</li>
                  <li>使用自然语言描述您想要的分析</li>
                  <li>系统会自动生成图表和洞察</li>
                </ul>
              </div>
            ) : (
              <div className="welcome-tips">
                <h3 style={{ color: '#52c41a' }}>数据集已准备就绪！</h3>
                <p>当前数据集：<strong>{datasets.find(d => d.id === sessionDataset)?.name}</strong></p>
                <ul>
                  <li>使用自然语言描述您想要的分析</li>
                  <li>系统会自动生成图表和洞察</li>
                  <li>您可以继续对话来深入分析</li>
                </ul>
              </div>
            )}
          </div>
        }
      />
    </div>
  );

  const RenderChatContent = () => (
    <>
      {/* 数据集选择器 */}
      {datasets.length > 0 && (
        <div className="chat-dataset-selector">
          <div className="dataset-selector-label">
            <DatabaseOutlined />
            <span>当前数据集：</span>
          </div>
          <Select
            value={sessionDataset || undefined}
            placeholder="选择数据集"
            onChange={HandleDatasetChange}
            className="dataset-selector"
            size="small"
            allowClear
          >
            {datasets.map(dataset => (
              <Select.Option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      )}

      {/* 消息列表 */}
      <div ref={containerRef} className="chat-messages-container">
        {messages.length === 0 ? (
          RenderEmptyState()
        ) : (
          <MessageList messages={messages} onRetry={HandleRetry} />
        )}
        
        {isLoading && (
          <div className="chat-loading">
            <Spin size="small" />
            <span>AI正在思考中...</span>
          </div>
        )}

        {error && (
          <div className="chat-error">
            <span className="error-message">发送失败：{error}</span>
            <Button 
              type="link" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={HandleRetry}
            >
              重试
            </Button>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="chat-input-container">
        <MessageInput 
          onSendMessage={HandleSendMessage}
          onClearChat={HandleClearChat}
          disabled={isLoading}
          placeholder={sessionDataset ? 
            `向 ${datasets.find(d => d.id === sessionDataset)?.name} 提问...` : 
            '请先选择数据集或直接输入问题...'
          }
        />
      </div>
    </>
  );

  if (!session && sessionId) {
    return (
      <div className="chat-window loading">
        <Spin size="large" />
        <p>正在加载聊天会话...</p>
      </div>
    );
  }

  return (
    <Layout className="chat-window">
      <Content className="chat-content">
        {RenderChatContent()}
      </Content>
    </Layout>
  );
};

export default ChatWindow;
