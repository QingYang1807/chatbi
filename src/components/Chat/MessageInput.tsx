// 消息输入组件

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Tooltip, Upload, message } from 'antd';
import { SendOutlined, PaperClipOutlined, DatabaseOutlined, ClearOutlined } from '@ant-design/icons';
import { useDataStore } from '../../stores';
import type { UploadFile } from 'antd/es/upload/interface';
import './MessageInput.css';

const { TextArea } = Input;

interface MessageInputProps {
  onSendMessage?: (content: string) => Promise<void>;
  onClearChat?: () => void;
  disabled?: boolean;
  placeholder?: string;
  showClearButton?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onClearChat,
  disabled = false,
  placeholder = '输入您的问题...',
  showClearButton = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const { activeDataset, UploadDataset } = useDataStore();

  // 使用传入的disabled状态
  const isDisabled = disabled;

  useEffect(() => {
    // 自动聚焦到输入框
    if (textAreaRef.current && !isDisabled) {
      textAreaRef.current.focus();
    }
  }, [isDisabled]);

  const HandleSend = async () => {
    const content = inputValue.trim();
    if (!content || isDisabled) return;

    try {
      setInputValue('');
      
      // 使用传入的onSendMessage回调
      if (onSendMessage) {
        await onSendMessage(content);
      } else {
        console.warn('MessageInput: onSendMessage回调函数未提供');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 针对不同类型的错误显示不同的提示
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      if (errorMessage.includes('请先配置AI模型')) {
        message.error({
          content: (
            <div>
              <div style={{ marginBottom: '8px' }}>⚙️ 请先配置AI模型</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                点击右上角设置按钮 → 模型配置 → 输入API密钥
              </div>
            </div>
          ),
          duration: 6
        });
      } else if (errorMessage.includes('API密钥无效')) {
        message.error({
          content: (
            <div>
              <div style={{ marginBottom: '8px' }}>🔑 API密钥无效</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                请检查设置中的API密钥是否正确
              </div>
            </div>
          ),
          duration: 6
        });
      } else if (errorMessage.includes('网络连接失败')) {
        message.error({
          content: (
            <div>
              <div style={{ marginBottom: '8px' }}>🌐 网络连接失败</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                请检查网络连接或稍后重试
              </div>
            </div>
          ),
          duration: 5
        });
      } else if (errorMessage.includes('API调用频率超限')) {
        message.error({
          content: (
            <div>
              <div style={{ marginBottom: '8px' }}>⏱️ 调用频率超限</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                请稍等片刻后再试
              </div>
            </div>
          ),
          duration: 5
        });
      } else {
        message.error(`发送失败：${errorMessage}`);
      }
      
      // 恢复输入框内容，让用户可以重新发送
      setInputValue(content);
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
    // 如果传入了自定义placeholder，优先使用
    if (placeholder !== '输入您的问题...') {
      return placeholder;
    }
    
    if (!activeDataset) {
      return '请先上传数据文件，然后输入您的问题...';
    }
    return `基于数据集"${activeDataset.name}"提问... (Shift+Enter 换行，Enter 发送)`;
  };

  const HandleClearChat = () => {
    if (onClearChat) {
      onClearChat();
    }
  };

  const HandleUploadFile = async (file: UploadFile) => {
    try {
      console.log('📤 聊天界面上传文件:', file.name, file.type, file.size);
      
      // 检查文件类型
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(file.type || '') && !allowedExtensions.includes(fileExtension)) {
        message.error('请上传CSV或Excel格式的文件');
        return false;
      }
      
      // 检查文件大小（限制50MB）
      const maxSize = 50 * 1024 * 1024;
      if (file.size && file.size > maxSize) {
        message.error('文件大小不能超过50MB');
        return false;
      }
      
      message.loading('正在上传和处理文件...', 0);
      
      // 上传文件
      await UploadDataset(file as unknown as File);
      
      message.destroy();
      message.success(`文件 "${file.name}" 上传成功！`);
      
      // 自动发送一条分析消息
      const messageToSend = inputValue.trim() || '请分析这个数据集，告诉我数据的基本情况和特征。';
      
      if (onSendMessage) {
        await onSendMessage(messageToSend);
      } else {
        console.warn('MessageInput: onSendMessage回调函数未提供，无法自动发送分析消息');
      }
      
      if (inputValue.trim()) {
        setInputValue('');
      }
      
    } catch (error) {
      message.destroy();
      console.error('文件上传失败:', error);
      message.error('文件上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
    
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
          disabled={isDisabled}
          className="input-textarea"
        />
        
        <div className="input-actions">
          <Space>
            <Tooltip title="上传数据文件 (CSV, Excel)">
              <Upload
                beforeUpload={HandleUploadFile}
                showUploadList={false}
                accept=".csv,.xlsx,.xls"
                multiple={false}
              >
                <Button 
                  type="text" 
                  icon={<PaperClipOutlined />}
                  disabled={isDisabled}
                />
              </Upload>
            </Tooltip>
            
            {showClearButton && onClearChat && (
              <Tooltip title="清空聊天记录">
                <Button 
                  type="text" 
                  icon={<ClearOutlined />}
                  onClick={HandleClearChat}
                  disabled={isDisabled}
                  danger
                />
              </Tooltip>
            )}
            
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={HandleSend}
              disabled={!inputValue.trim() || isDisabled}
              loading={disabled}
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
