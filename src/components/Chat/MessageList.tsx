// 消息列表组件

import React from 'react';
import { ChatMessage } from '../../types';
import MessageBubble from './MessageBubble';
import './MessageList.css';

interface MessageListProps {
  messages: ChatMessage[];
  onRetry?: () => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onRetry }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onRetry={onRetry} />
      ))}
    </div>
  );
};

export default MessageList;
