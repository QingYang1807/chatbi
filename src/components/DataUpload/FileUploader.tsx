// 文件上传组件

import React, { useState } from 'react';
import { Upload, Button, Progress, Alert, Card, Space, Typography, List, Tag } from 'antd';
import { InboxOutlined, UploadOutlined, FileExcelOutlined, FilePdfOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useDataStore } from '../../stores';
import { dataService } from '../../services/dataService';
import './FileUploader.css';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface FileUploaderProps {
  onUploadSuccess?: () => void;
  allowMultiple?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess, allowMultiple = false }) => {
  const { UploadDataset, isUploading, uploadProgress, error } = useDataStore();
  const [dragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);


  const supportedFormats = dataService.GetSupportedFormats();
  const maxFileSize = dataService.GetMaxFileSize();

  const HandleSingleUpload = async (file: File) => {
    try {
      await UploadDataset(file);
      onUploadSuccess?.();
    } catch (error) {
      console.error('文件上传失败:', error);
    }
    return false; // 阻止默认上传行为
  };

  const HandleMultipleUpload = async (files: File[]) => {
    console.log('🚀 开始批量上传文件:', files.map(f => f.name));
    
    // 初始化上传状态
    const initialFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    setUploadingFiles(initialFiles);
    
    // 依次上传每个文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 上传第 ${i + 1}/${files.length} 个文件:`, file.name);
      
      try {
        // 更新当前文件进度
        setUploadingFiles(prev => prev.map((item, index) => 
          index === i ? { ...item, progress: 50 } : item
        ));
        
        await UploadDataset(file);
        
        // 标记成功
        setUploadingFiles(prev => prev.map((item, index) => 
          index === i ? { ...item, progress: 100, status: 'success' } : item
        ));
        
        console.log(`✅ 文件 ${file.name} 上传成功`);
        
      } catch (error) {
        console.error(`❌ 文件 ${file.name} 上传失败:`, error);
        
        // 标记失败
        setUploadingFiles(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            progress: 0, 
            status: 'error',
            error: error instanceof Error ? error.message : '上传失败'
          } : item
        ));
      }
    }
    
    console.log('🎉 批量上传完成');
    
    // 延迟清理状态
    setTimeout(() => {
      setUploadingFiles([]);
      onUploadSuccess?.();
    }, 2000);
  };

  const HandleUpload = async (file: File | File[]) => {
    if (Array.isArray(file)) {
      return HandleMultipleUpload(file);
    } else {
      return HandleSingleUpload(file);
    }
  };

  const BeforeUpload = (file: File) => {
    const isValidFormat = supportedFormats.some(format => 
      file.name.toLowerCase().endsWith(format)
    );

    if (!isValidFormat) {
      return Upload.LIST_IGNORE;
    }

    if (file.size > maxFileSize) {
      return Upload.LIST_IGNORE;
    }

    return true;
  };



  const FormatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  return (
    <div className="file-uploader">
      <Card className="upload-card">
        <div className="upload-header">
          <Title level={4}>上传数据文件</Title>
          <Text type="secondary">
            支持 {supportedFormats.join(', ')} 格式，最大 {FormatFileSize(maxFileSize)}
          </Text>
        </div>

        {error && (
          <Alert
            message="上传失败"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <Dragger
          name="file"
          multiple={allowMultiple}
          beforeUpload={BeforeUpload}
          customRequest={({ file }) => {
            if (allowMultiple && Array.isArray(file)) {
              HandleUpload(file as File[]);
            } else {
              HandleUpload(file as File);
            }
          }}
          showUploadList={false}
          disabled={isUploading || uploadingFiles.length > 0}
          className={`upload-dragger ${dragOver ? 'drag-over' : ''}`}
        >
          <div className="upload-content">
            {isUploading || uploadingFiles.length > 0 ? (
              <div className="upload-progress">
                <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                <Title level={4}>正在上传...</Title>
                {!allowMultiple && (
                  <Progress
                    percent={uploadProgress}
                    status="active"
                    strokeColor={{
                      from: '#108ee9',
                      to: '#87d068',
                    }}
                  />
                )}
                <Text type="secondary">请稍候，正在处理您的数据文件</Text>
              </div>
            ) : (
              <div className="upload-placeholder">
                <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                <Title level={4} style={{ color: '#666' }}>
                  点击或拖拽文件到此区域上传
                </Title>
                <Text type="secondary">
                  支持{allowMultiple ? '多个' : '单个'}文件上传，文件将在本地处理，不会上传到服务器
                </Text>
              </div>
            )}
          </div>
        </Dragger>

        {/* 多文件上传进度 */}
        {allowMultiple && uploadingFiles.length > 0 && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Title level={5}>上传进度</Title>
            <List
              size="small"
              dataSource={uploadingFiles}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      item.status === 'uploading' ? (
                        <LoadingOutlined style={{ color: '#1677ff' }} />
                      ) : item.status === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )
                    }
                    title={item.file.name}
                    description={
                      item.status === 'error' ? (
                        <Text type="danger">{item.error}</Text>
                      ) : (
                        <Space>
                          <Tag color={
                            item.status === 'success' ? 'green' : 
                            item.status === 'uploading' ? 'blue' : 'red'
                          }>
                            {item.status === 'uploading' ? '上传中' : 
                             item.status === 'success' ? '成功' : '失败'}
                          </Tag>
                          {item.status === 'uploading' && (
                            <Progress 
                              percent={item.progress} 
                              size="small" 
                              style={{ width: 100 }}
                            />
                          )}
                        </Space>
                      )
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        <div className="upload-tips">
          <Title level={5}>支持的文件格式：</Title>
          <Space wrap size="middle">
            <div className="format-item">
              <FilePdfOutlined style={{ color: '#52c41a', fontSize: 20 }} />
              <span>CSV 文件</span>
            </div>
            <div className="format-item">
              <FileExcelOutlined style={{ color: '#1677ff', fontSize: 20 }} />
              <span>Excel 文件 (.xlsx, .xls)</span>
            </div>
          </Space>

          <div className="upload-notes">
            <Title level={5}>注意事项：</Title>
            <ul>
              <li>确保数据文件包含表头（第一行为字段名）</li>
              <li>数据格式应该规整，避免合并单元格</li>
              <li>文件大小不超过 {FormatFileSize(maxFileSize)}</li>
              <li>所有数据处理都在本地进行，保护您的数据安全</li>
            </ul>
          </div>
        </div>

        <div className="upload-actions">
          <Button
            type="primary"
            icon={<UploadOutlined />}
            disabled={isUploading}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = supportedFormats.join(',');
              input.multiple = allowMultiple;
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) {
                  if (allowMultiple) {
                    HandleUpload(Array.from(files));
                  } else {
                    const file = files[0];
                    if (file) {
                      HandleUpload(file);
                    }
                  }
                }
              };
              input.click();
            }}
          >
            选择文件
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FileUploader;
