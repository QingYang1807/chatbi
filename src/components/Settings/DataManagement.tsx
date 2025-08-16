// 数据管理组件

import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Upload, 
  Space, 
  Divider, 
  message, 
  Modal, 
  Typography, 
  List,
  Tag,
  Popconfirm,
  Row,
  Col,
  Alert
} from 'antd';
import { 
  DownloadOutlined, 
  UploadOutlined, 
  DatabaseOutlined,
  DeleteOutlined,
  FileOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { storageService } from '../../services/storageService';
import { useDataStore, useSettingsStore, useChatStore } from '../../stores';
import type { UploadFile } from 'antd/es/upload/interface';
import { DataSet } from '../../types';
import CreateDataset from '../DataUpload/CreateDataset';
import './DataManagement.css';

const { Title, Text, Paragraph } = Typography;

const DataManagement: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCreateDataset, setShowCreateDataset] = useState(false);
  const { datasets, LoadDatasets, DeleteDataset } = useDataStore();
  const { LoadSettings } = useSettingsStore();
  const { LoadChatHistory } = useChatStore();

  // 导出数据
  const HandleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = await storageService.ExportAllData();
      storageService.DownloadBackup(exportData);
      message.success('数据导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsExporting(false);
    }
  };

  // 导入数据
  const HandleImportData = async (file: UploadFile) => {
    setIsImporting(true);
    try {
      const content = await storageService.ReadBackupFile(file as any);
      
      Modal.confirm({
        title: '确认导入数据',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <Paragraph>
              导入数据将<Text strong type="danger">覆盖</Text>当前的所有设置、数据集和聊天历史。
            </Paragraph>
            <Paragraph>
              建议您在导入前先导出当前数据作为备份。
            </Paragraph>
          </div>
        ),
        okText: '确认导入',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          try {
            await storageService.ImportAllData(content);
            
            // 重新加载所有数据
            await LoadSettings();
            await LoadDatasets();
            await LoadChatHistory();
            
            message.success('数据导入成功！页面将自动刷新。');
            
            // 延迟刷新页面
            setTimeout(() => {
              window.location.reload();
            }, 1500);
            
          } catch (error) {
            console.error('导入失败:', error);
            message.error('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
          }
        },
      });
      
    } catch (error) {
      console.error('读取文件失败:', error);
      message.error('读取文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsImporting(false);
    }
  };

  // 删除数据集
  const HandleDeleteDataset = async (dataset: DataSet) => {
    try {
      await DeleteDataset(dataset.id);
      message.success(`数据集 "${dataset.name}" 已删除`);
    } catch (error) {
      console.error('删除数据集失败:', error);
      message.error('删除数据集失败');
    }
  };

  // 清除所有数据
  const HandleClearAllData = () => {
    Modal.confirm({
      title: '确认清除所有数据',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            此操作将<Text strong type="danger">永久删除</Text>以下所有数据：
          </Paragraph>
          <ul>
            <li>API密钥和模型配置</li>
            <li>UI偏好设置</li>
            <li>所有数据集</li>
            <li>聊天历史记录</li>
          </ul>
          <Paragraph>
            <Text strong type="danger">此操作无法撤销！</Text>
          </Paragraph>
        </div>
      ),
      okText: '确认清除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await storageService.ClearAllData();
          message.success('所有数据已清除！页面将自动刷新。');
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          
        } catch (error) {
          console.error('清除数据失败:', error);
          message.error('清除数据失败');
        }
      },
    });
  };



  return (
    <div className="data-management">
      <Title level={3}>
        <DatabaseOutlined /> 数据管理
      </Title>
      
      <Row gutter={16}>
        <Col span={12}>
          {/* 备份与恢复 */}
          <Card title="备份与恢复" className="management-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="建议定期备份数据"
                description="备份文件包含所有设置、数据集和聊天历史，可用于恢复或迁移到其他设备。"
                type="info"
                showIcon
              />
              
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={HandleExportData}
                loading={isExporting}
                block
              >
                导出备份
              </Button>
              
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={(file) => {
                  HandleImportData(file);
                  return false;
                }}
                disabled={isImporting}
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={isImporting}
                  block
                >
                  导入备份
                </Button>
              </Upload>
            </Space>
          </Card>
        </Col>
        
        <Col span={12}>
          {/* 系统清理 */}
          <Card title="系统清理" className="management-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="谨慎操作"
                description="清除数据将删除所有设置和数据，此操作无法撤销。"
                type="warning"
                showIcon
              />
              
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={HandleClearAllData}
                block
              >
                清除所有数据
              </Button>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
                block
              >
                刷新应用
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 数据集管理 */}
      <Card 
        title="数据集管理" 
        className="management-card"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateDataset(true)}
          >
            创建数据集
          </Button>
        }
      >
        {datasets.length === 0 ? (
          <div className="empty-state">
            <FileOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Paragraph type="secondary">暂无数据集</Paragraph>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateDataset(true)}
            >
              创建第一个数据集
            </Button>
          </div>
        ) : (
          <List
            dataSource={datasets}
            renderItem={(dataset) => (
              <List.Item
                actions={[
                  <Popconfirm
                    title="确认删除此数据集？"
                    description="删除后无法恢复，请谨慎操作。"
                    onConfirm={() => HandleDeleteDataset(dataset)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      size="small"
                    >
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<FileOutlined style={{ fontSize: 20 }} />}
                  title={dataset.name}
                  description={
                    <Space>
                      <Tag color="blue">{dataset.summary.totalRows} 行</Tag>
                      <Tag color="green">{dataset.summary.totalColumns} 列</Tag>
                      <Text type="secondary">
                        上传于 {new Date(dataset.createdAt).toLocaleString()}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 创建数据集模态框 */}
      <CreateDataset
        visible={showCreateDataset}
        onClose={() => setShowCreateDataset(false)}
        onSuccess={(datasetId) => {
          console.log('数据集创建成功:', datasetId);
          // 重新加载数据集列表
          LoadDatasets();
        }}
      />
    </div>
  );
};

export default DataManagement;
