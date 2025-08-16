// 消息气泡组件

import React from 'react';
import { Avatar, Card, Tag, Button, Space } from 'antd';
import { UserOutlined, RobotOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github.css'; // 导入代码高亮样式
import { ChatMessage } from '../../types';
import { useChatStore } from '../../stores';
import ChartRenderer from '../Visualization/ChartRenderer';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { RetryLastMessage } = useChatStore();

  const GetAvatar = () => {
    switch (message.type) {
      case 'user':
        return <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />;
      case 'assistant':
        return <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />;
      case 'system':
        return <Avatar icon={<SettingOutlined />} style={{ backgroundColor: '#faad14' }} />;
      default:
        return <Avatar icon={<UserOutlined />} />;
    }
  };

  const GetMessageClassName = () => {
    let className = 'message-bubble';
    className += ` message-${message.type}`;
    if (message.error) {
      className += ' message-error';
    }
    return className;
  };

  const HandleRetry = () => {
    RetryLastMessage();
  };

  const RenderContent = () => {
    // 判断是否为纯文本（没有markdown语法）
    const hasMarkdown = /[*_`#\-\[\]!]/.test(message.content) || 
                       message.content.includes('```') || 
                       message.content.includes('**') ||
                       message.content.includes('__') ||
                       message.content.includes('~~');

    if (hasMarkdown) {
      return (
        <div className="message-content markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              // 自定义代码块渲染
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                if (!inline && language) {
                  return (
                    <div className="code-block">
                      <div className="code-header">
                        <span className="code-language">{language}</span>
                      </div>
                      <pre className={className} {...props}>
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                }
                
                return (
                  <code className={`inline-code ${className || ''}`} {...props}>
                    {children}
                  </code>
                );
              },
              // 自定义表格渲染
              table: ({ children }) => (
                <div className="table-wrapper">
                  <table className="markdown-table">{children}</table>
                </div>
              ),
              // 自定义链接渲染
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                  {children}
                </a>
              ),
              // 自定义列表渲染
              ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
              ol: ({ children }) => <ol className="markdown-ordered-list">{children}</ol>,
              // 自定义引用块渲染
              blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    } else {
      // 纯文本内容的处理（保持原有逻辑）
      const content = message.content.split('\n').map((line, index) => (
        <div key={index}>
          {line}
          {index < message.content.split('\n').length - 1 && <br />}
        </div>
      ));

      return <div className="message-content">{content}</div>;
    }
  };

  return (
    <div className={GetMessageClassName()}>
      <div className="message-header">
        {GetAvatar()}
        <div className="message-meta">
          <span className="message-time">
            {dayjs(message.timestamp).format('HH:mm:ss')}
          </span>
          {message.type === 'system' && (
            <Tag color="orange">系统消息</Tag>
          )}
          {message.error && (
            <Tag color="red">错误</Tag>
          )}
        </div>
      </div>

      <Card 
        className="message-card"
        bodyStyle={{ padding: '12px 16px' }}
        bordered={false}
      >
        {RenderContent()}

        {message.error && message.type === 'assistant' && (
          <div className="message-actions">
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

        {/* 渲染图表 */}
        {message.charts && message.charts.length > 0 && (
          <div className="message-charts">
            <div className="charts-header">
              <h4>生成的图表：</h4>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {message.charts.map((chart) => (
                <ChartRenderer
                  key={chart.id}
                  chartData={chart}
                  height={300}
                />
              ))}
            </Space>
          </div>
        )}

        {/* 渲染附件 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            <div className="attachments-header">
              <h4>附件：</h4>
            </div>
            <Space wrap>
              {message.attachments.map((attachment) => (
                <Tag key={attachment.id} color="blue">
                  {attachment.name}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MessageBubble;
