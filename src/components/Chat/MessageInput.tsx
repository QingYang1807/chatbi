// 消息输入组件

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Tooltip, Upload, message } from 'antd';
import { SendOutlined, PaperClipOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useChatStore, useDataStore } from '../../stores';
import './MessageInput.css';

const { TextArea } = Input;

const MessageInput: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const { SendMessage, isLoading } = useChatStore();
  const { activeDataset } = useDataStore();

  useEffect(() => {
    // 自动聚焦到输入框
    if (textAreaRef.current && !isLoading) {
      textAreaRef.current.focus();
    }
  }, [isLoading]);

  const HandleSend = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    try {
      setInputValue('');
      await SendMessage(content);
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败，请重试');
    }
  };

  const HandleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter 换行
        return;
      } else if (!isComposing) {
        // Enter 发送
        e.preventDefault();
        HandleSend();
      }
    }
  };

  const HandleCompositionStart = () => {
    setIsComposing(true);
  };

  const HandleCompositionEnd = () => {
    setIsComposing(false);
  };

  const GetPlaceholder = () => {
    if (!activeDataset) {
      return '请先上传数据文件，然后输入您的问题...';
    }
    return `基于数据集"${activeDataset.name}"提问... (Shift+Enter 换行，Enter 发送)`;
  };

  const HandleUploadFile = () => {
    // 这里可以处理文件上传逻辑
    message.info('文件上传功能开发中...');
    return false; // 阻止默认上传行为
  };

  return (
    <div className="message-input">
      {activeDataset && (
        <div className="input-status">
          <DatabaseOutlined style={{ color: '#52c41a' }} />
          <span>当前数据集：{activeDataset.name}</span>
        </div>
      )}
      
      <div className="input-container">
        <TextArea
          ref={textAreaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={HandleKeyPress}
          onCompositionStart={HandleCompositionStart}
          onCompositionEnd={HandleCompositionEnd}
          placeholder={GetPlaceholder()}
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={isLoading}
          className="input-textarea"
        />
        
        <div className="input-actions">
          <Space>
            <Tooltip title="上传文件">
              <Upload
                beforeUpload={HandleUploadFile}
                showUploadList={false}
                accept=".csv,.xlsx,.xls"
              >
                <Button 
                  type="text" 
                  icon={<PaperClipOutlined />}
                  disabled={isLoading}
                />
              </Upload>
            </Tooltip>
            
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={HandleSend}
              disabled={!inputValue.trim() || isLoading}
              loading={isLoading}
            >
              发送
            </Button>
          </Space>
        </div>
      </div>

      {!activeDataset && (
        <div className="input-hint">
          <span>💡 提示：先上传数据文件，让AI更好地理解和分析您的数据</span>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
