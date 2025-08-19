// 现代化的文件上传弹窗组件

import React, { useState, useRef, useCallback } from 'react';
import { 
  Modal, 
  Button, 
  Upload, 
  message, 
  Progress, 
  List, 
  Card, 
  Typography, 
  Space, 
  Popconfirm, 
  Tag, 
  Tooltip, 
  Divider,
  Row,
  Col,
  Alert
} from 'antd';
import { 
  CloudUploadOutlined, 
  DeleteOutlined, 
  FileExcelOutlined, 
  FileTextOutlined, 
  EyeOutlined, 
  DragOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ClearOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDataStore } from '../../stores';
import { dataService } from '../../services/dataService';
import './UploadModal.css';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileItem {
  id: string;
  file: File;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  previewData?: any[];
}

const UploadModal: React.FC<UploadModalProps> = ({ visible, onClose, onSuccess }) => {
  const { UploadDataset, isUploading } = useDataStore();
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 支持的文件格式和大小限制
  const supportedFormats = dataService.GetSupportedFormats();
  const maxFileSize = dataService.GetMaxFileSize();

  // 生成唯一ID
  const GenerateId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 格式化文件大小
  const FormatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 检查文件格式
  const ValidateFile = (file: File): boolean => {
    const isValidFormat = supportedFormats.some(format => 
      file.name.toLowerCase().endsWith(format.toLowerCase())
    );
    
    if (!isValidFormat) {
      message.error(`不支持的文件格式：${file.name}`);
      return false;
    }

    if (file.size > maxFileSize) {
      message.error(`文件 ${file.name} 超过大小限制 ${FormatFileSize(maxFileSize)}`);
      return false;
    }

    return true;
  };

  // 读取文件预览数据
  const ReadFilePreview = async (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (file.name.endsWith('.csv')) {
            const lines = text.split('\n').slice(0, 3); // 只读取前3行
            const data = lines.map(line => line.split(','));
            resolve(data);
          } else {
            // Excel 文件简单预览
            resolve([['Excel文件', '需要上传后查看详细内容']]);
          }
        } catch (error) {
          resolve([['预览失败', '']]);
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  };

  // 添加文件到列表
  const AddFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(ValidateFile);
    
    if (validFiles.length === 0) return;

    const newFiles: FileItem[] = [];
    
    for (const file of validFiles) {
      // 检查是否已存在相同名称的文件
      const exists = fileList.some(item => item.file.name === file.name);
      if (exists) {
        message.warning(`文件 ${file.name} 已存在，跳过添加`);
        continue;
      }

      const previewData = await ReadFilePreview(file);
      
      newFiles.push({
        id: GenerateId(),
        file,
        status: 'waiting',
        progress: 0,
        previewData
      });
    }

    setFileList(prev => [...prev, ...newFiles]);
    message.success(`成功添加 ${newFiles.length} 个文件`);
  }, [fileList]);

  // 处理文件拖拽
  const HandleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    AddFiles(files);
  }, [AddFiles]);

  const HandleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const HandleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  // 文件选择处理
  const HandleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    AddFiles(files);
  };

  // 删除文件
  const RemoveFile = (id: string) => {
    setFileList(prev => prev.filter(item => item.id !== id));
  };

  // 清空文件列表
  const ClearAllFiles = () => {
    setFileList([]);
  };

  // 文件列表拖拽排序
  const HandleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(fileList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFileList(items);
  };

  // 开始上传
  const StartUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }

    setUploading(true);
    
    // 重置所有文件状态
    setFileList(prev => prev.map(item => ({
      ...item,
      status: 'waiting' as const,
      progress: 0,
      error: undefined
    })));

    let successCount = 0;
    let errorCount = 0;

    // 逐个上传文件
    for (let i = 0; i < fileList.length; i++) {
      const fileItem = fileList[i];
      
      try {
        // 更新状态为上传中
        setFileList(prev => prev.map(item => 
          item.id === fileItem.id ? { ...item, status: 'uploading', progress: 50 } : item
        ));

        // 执行上传
        await UploadDataset(fileItem.file);

        // 更新状态为成功
        setFileList(prev => prev.map(item => 
          item.id === fileItem.id ? { ...item, status: 'success', progress: 100 } : item
        ));

        successCount++;
        
      } catch (error) {
        console.error(`文件 ${fileItem.file.name} 上传失败:`, error);
        
        // 更新状态为失败
        setFileList(prev => prev.map(item => 
          item.id === fileItem.id ? { 
            ...item, 
            status: 'error', 
            progress: 0,
            error: error instanceof Error ? error.message : '上传失败'
          } : item
        ));

        errorCount++;
      }
    }

    setUploading(false);

    // 显示上传结果
    if (successCount > 0 && errorCount === 0) {
      message.success(`所有文件上传成功！共 ${successCount} 个文件`);
    } else if (successCount > 0 && errorCount > 0) {
      message.warning(`部分文件上传成功！成功：${successCount} 个，失败：${errorCount} 个`);
    } else {
      message.error(`所有文件上传失败！共 ${errorCount} 个文件`);
    }

    // 如果有成功的文件，触发成功回调
    if (successCount > 0) {
      onSuccess?.();
    }
  };

  // 关闭弹窗
  const HandleClose = () => {
    if (uploading) {
      message.warning('正在上传中，请稍候...');
      return;
    }
    setFileList([]);
    onClose();
  };

  // 获取文件图标
  const GetFileIcon = (fileName: string) => {
    if (fileName.endsWith('.csv')) {
      return <FileTextOutlined style={{ color: '#52c41a' }} />;
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return <FileExcelOutlined style={{ color: '#1677ff' }} />;
    }
    return <FileTextOutlined />;
  };

  // 获取状态图标
  const GetStatusIcon = (status: FileItem['status']) => {
    switch (status) {
      case 'waiting':
        return <CloudUploadOutlined style={{ color: '#d9d9d9' }} />;
      case 'uploading':
        return <LoadingOutlined style={{ color: '#1677ff' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  // 渲染文件预览
  const RenderFilePreview = (item: FileItem) => {
    if (!item.previewData || item.previewData.length === 0) {
      return <Text type="secondary">无预览数据</Text>;
    }

    return (
      <div className="file-preview">
        {item.previewData.map((row, index) => (
          <div key={index} className="preview-row">
            {row.map((cell: string, cellIndex: number) => (
              <span key={cellIndex} className="preview-cell">
                {cell.length > 20 ? cell.substring(0, 20) + '...' : cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="upload-modal-header">
          <CloudUploadOutlined />
          <span style={{ marginLeft: 8 }}>上传数据文件</span>
        </div>
      }
      open={visible}
      onCancel={HandleClose}
      width={800}
      footer={
        <div className="upload-modal-footer">
          <Space>
            <Button onClick={HandleClose} disabled={uploading}>
              取消
            </Button>
            {fileList.length > 0 && (
              <Popconfirm
                title="确定要清空所有文件吗？"
                onConfirm={ClearAllFiles}
                disabled={uploading}
              >
                <Button icon={<ClearOutlined />} disabled={uploading}>
                  清空列表
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={StartUpload}
              loading={uploading}
              disabled={fileList.length === 0}
            >
              开始上传 ({fileList.length})
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
      maskClosable={!uploading}
    >
      <div className="upload-modal-content">
        {/* 拖拽上传区域 */}
        <div
          className={`upload-drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDrop={HandleDrop}
          onDragOver={HandleDragOver}
          onDragLeave={HandleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={supportedFormats.join(',')}
            onChange={HandleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div className="drop-zone-content">
            <CloudUploadOutlined className="upload-icon" />
            <Title level={4}>点击选择文件或拖拽到此处</Title>
            <Text type="secondary">
              支持 {supportedFormats.join(', ')} 格式，单个文件最大 {FormatFileSize(maxFileSize)}
            </Text>
            <Text type="secondary">支持多文件同时上传</Text>
          </div>
        </div>

        {/* 文件格式说明 */}
        <Alert
          message="支持的文件格式"
          description={
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Space>
                  <FileTextOutlined style={{ color: '#52c41a' }} />
                  <span>CSV 文件 (.csv)</span>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <FileExcelOutlined style={{ color: '#1677ff' }} />
                  <span>Excel 文件 (.xlsx, .xls)</span>
                </Space>
              </Col>
            </Row>
          }
          type="info"
          showIcon
          style={{ margin: '16px 0' }}
        />

        {/* 文件列表 */}
        {fileList.length > 0 && (
          <Card 
            title={
              <Space>
                <span>文件列表</span>
                <Tag color="blue">{fileList.length} 个文件</Tag>
              </Space>
            }
            size="small"
            className="file-list-card"
          >
            <DragDropContext onDragEnd={HandleDragEnd}>
              <Droppable droppableId="fileList">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    <List
                      size="small"
                      dataSource={fileList}
                      renderItem={(item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`file-list-item ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <List.Item
                                actions={[
                                  <Tooltip title="预览数据">
                                    <Button
                                      type="text"
                                      icon={<EyeOutlined />}
                                      size="small"
                                      onClick={() => {
                                        Modal.info({
                                          title: `预览：${item.file.name}`,
                                          content: RenderFilePreview(item),
                                          width: 600,
                                        });
                                      }}
                                    />
                                  </Tooltip>,
                                  <Tooltip title="删除文件">
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      size="small"
                                      onClick={() => RemoveFile(item.id)}
                                      disabled={uploading}
                                    />
                                  </Tooltip>
                                ]}
                              >
                                <List.Item.Meta
                                  avatar={
                                    <Space>
                                      <div
                                        {...provided.dragHandleProps}
                                        className="drag-handle"
                                      >
                                        <DragOutlined />
                                      </div>
                                      {GetFileIcon(item.file.name)}
                                    </Space>
                                  }
                                  title={
                                    <Space>
                                      <span>{item.file.name}</span>
                                      <Tag color={
                                        item.status === 'success' ? 'green' :
                                        item.status === 'uploading' ? 'blue' :
                                        item.status === 'error' ? 'red' : 'default'
                                      }>
                                        {item.status === 'waiting' ? '等待中' :
                                         item.status === 'uploading' ? '上传中' :
                                         item.status === 'success' ? '成功' : '失败'}
                                      </Tag>
                                    </Space>
                                  }
                                  description={
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                      <Text type="secondary">
                                        {FormatFileSize(item.file.size)}
                                      </Text>
                                      {item.status === 'uploading' && (
                                        <Progress
                                          percent={item.progress}
                                          size="small"
                                          status="active"
                                        />
                                      )}
                                      {item.status === 'error' && item.error && (
                                        <Text type="danger">{item.error}</Text>
                                      )}
                                    </Space>
                                  }
                                />
                                <div className="file-status">
                                  {GetStatusIcon(item.status)}
                                </div>
                              </List.Item>
                            </div>
                          )}
                        </Draggable>
                      )}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default UploadModal;
