// 消息气泡组件

import React from 'react';
import { Avatar, Card, Tag, Button, Space } from 'antd';
import { UserOutlined, RobotOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
    // 处理换行和格式化
    const content = message.content.split('\n').map((line, index) => (
      <div key={index}>
        {line}
        {index < message.content.split('\n').length - 1 && <br />}
      </div>
    ));

    return <div className="message-content">{content}</div>;
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
