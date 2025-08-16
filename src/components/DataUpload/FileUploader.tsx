// 文件上传组件

import React, { useState } from 'react';
import { Upload, Button, Progress, Alert, Card, Space, Typography } from 'antd';
import { InboxOutlined, UploadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useDataStore } from '../../stores';
import { dataService } from '../../services/dataService';
import './FileUploader.css';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface FileUploaderProps {
  onUploadSuccess?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
  const { UploadDataset, isUploading, uploadProgress, error } = useDataStore();
  const [dragOver] = useState(false);

  const supportedFormats = dataService.GetSupportedFormats();
  const maxFileSize = dataService.GetMaxFileSize();

  const HandleUpload = async (file: File) => {
    try {
      await UploadDataset(file);
      onUploadSuccess?.();
    } catch (error) {
      console.error('文件上传失败:', error);
    }
    return false; // 阻止默认上传行为
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
          multiple={false}
          beforeUpload={BeforeUpload}
          customRequest={({ file }) => HandleUpload(file as File)}
          showUploadList={false}
          disabled={isUploading}
          className={`upload-dragger ${dragOver ? 'drag-over' : ''}`}
        >
          <div className="upload-content">
            {isUploading ? (
              <div className="upload-progress">
                <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                <Title level={4}>正在上传...</Title>
                <Progress
                  percent={uploadProgress}
                  status="active"
                  strokeColor={{
                    from: '#108ee9',
                    to: '#87d068',
                  }}
                />
                <Text type="secondary">请稍候，正在处理您的数据文件</Text>
              </div>
            ) : (
              <div className="upload-placeholder">
                <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                <Title level={4} style={{ color: '#666' }}>
                  点击或拖拽文件到此区域上传
                </Title>
                <Text type="secondary">
                  支持单个文件上传，文件将在本地处理，不会上传到服务器
                </Text>
              </div>
            )}
          </div>
        </Dragger>

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
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  HandleUpload(file);
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
