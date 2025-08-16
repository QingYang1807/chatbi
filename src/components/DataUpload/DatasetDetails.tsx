// 数据集详情查看/编辑组件

import React, { useState } from 'react';
import { 
  Modal, 
  Descriptions, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Input, 
  Form, 
  message,
  Popconfirm,
  Tabs,
  Card,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  CloseOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TableOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { DataSet } from '../../types';
import { useDataStore } from '../../stores';
import DataEditor from './DataEditor';
import './DatasetDetails.css';

const { Text } = Typography;
const { TextArea } = Input;

interface DatasetDetailsProps {
  visible: boolean;
  dataset: DataSet | null;
  onClose: () => void;
  onUpdate?: (dataset: DataSet) => void;
  onDelete?: (datasetId: string) => void;
}

const DatasetDetails: React.FC<DatasetDetailsProps> = ({
  visible,
  dataset,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const { DeleteDataset } = useDataStore();

  if (!dataset) return null;

  // 开始编辑
  const StartEdit = () => {
    setIsEditing(true);
    form.setFieldsValue({
      name: dataset.name,
      description: dataset.description || '',
    });
  };

  // 取消编辑
  const CancelEdit = () => {
    setIsEditing(false);
    form.resetFields();
  };

  // 保存编辑
  const SaveEdit = async () => {
    try {
      const values = await form.validateFields();
      
      const updatedDataset: DataSet = {
        ...dataset,
        name: values.name,
        description: values.description,
        updatedAt: new Date().toISOString(),
      };

      // 这里应该调用更新服务
      onUpdate?.(updatedDataset);
      setIsEditing(false);
      message.success('数据集信息更新成功');
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 删除数据集
  const HandleDelete = async () => {
    try {
      await DeleteDataset(dataset.id);
      onDelete?.(dataset.id);
      onClose();
      message.success('数据集删除成功');
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = {
          string: 'blue',
          number: 'green',
          date: 'orange',
          boolean: 'purple'
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      }
    },
    {
      title: '示例数据',
      dataIndex: 'examples',
      key: 'examples',
      render: (examples: string[]) => (
        <Space wrap>
          {examples?.slice(0, 3).map((example, index) => (
            <Tag key={index} color="default">{example}</Tag>
          ))}
          {examples?.length > 3 && <Text type="secondary">...</Text>}
        </Space>
      )
    }
  ];

  // 数据预览表格配置
  const previewColumns = dataset.columns.map(col => ({
    title: col.name,
    dataIndex: col.name,
    key: col.name,
    width: 150,
    render: (text: any) => (
      <Text ellipsis={{ tooltip: true }} style={{ maxWidth: 120 }}>
        {String(text)}
      </Text>
    )
  }));

  // Tab页配置
  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      icon: <InfoCircleOutlined />,
      children: (
        <div className="dataset-info">
          <Card>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总行数"
                  value={dataset.summary.totalRows}
                  prefix={<TableOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="总列数"
                  value={dataset.summary.totalColumns}
                  prefix={<BarChartOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="文件大小"
                  value={dataset.size || 0}
                  formatter={(value) => `${((value as number) / 1024 / 1024).toFixed(2)} MB`}
                  prefix={<FileTextOutlined />}
                />
              </Col>
            </Row>
          </Card>

          <Card title="数据集描述" style={{ marginTop: 16 }}>
            {isEditing ? (
              <Form form={form} layout="vertical">
                <Form.Item
                  name="name"
                  label="数据集名称"
                  rules={[{ required: true, message: '请输入数据集名称' }]}
                >
                  <Input placeholder="请输入数据集名称" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="描述信息"
                >
                  <TextArea 
                    rows={4} 
                    placeholder="请输入数据集描述信息（可选）"
                  />
                </Form.Item>
              </Form>
            ) : (
              <Descriptions column={1}>
                <Descriptions.Item label="数据集名称">
                  {dataset.name}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(dataset.createdAt).toLocaleString()}
                </Descriptions.Item>
                {dataset.updatedAt && (
                  <Descriptions.Item label="更新时间">
                    {new Date(dataset.updatedAt).toLocaleString()}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="描述信息">
                  {dataset.description || '暂无描述'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </div>
      )
    },
    {
      key: 'schema',
      label: '数据结构',
      icon: <TableOutlined />,
      children: (
        <Card>
          <Table
            columns={columns}
            dataSource={dataset.columns}
            rowKey="name"
            pagination={false}
            size="small"
          />
        </Card>
      )
    },
    {
      key: 'preview',
      label: '数据预览',
      icon: <BarChartOutlined />,
      children: (
        <Card>
          <Table
            columns={previewColumns}
            dataSource={dataset.rows.slice(0, 100)}
            rowKey={(_, index) => index || 0}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `显示第 ${range[0]}-${range[1]} 条，共 ${Math.min(total, 100)} 条（预览前100行）`
            }}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )
    },
    {
      key: 'edit',
      label: '数据编辑',
      icon: <EditOutlined />,
      children: (
        <DataEditor 
          dataset={dataset} 
          onUpdate={(updatedDataset) => {
            onUpdate?.(updatedDataset);
          }}
        />
      )
    }
  ];

  return (
    <Modal
      title={
        <div className="modal-title">
          <FileTextOutlined />
          <span style={{ marginLeft: 8 }}>数据集详情</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={
        <Space>
          {isEditing ? (
            <>
              <Button onClick={CancelEdit} icon={<CloseOutlined />}>
                取消
              </Button>
              <Button 
                type="primary" 
                onClick={SaveEdit} 
                icon={<SaveOutlined />}
              >
                保存
              </Button>
            </>
          ) : (
            <>
              <Button onClick={StartEdit} icon={<EditOutlined />}>
                编辑
              </Button>
              <Popconfirm
                title="确认删除数据集？"
                description="删除后无法恢复，请谨慎操作。"
                onConfirm={HandleDelete}
                okText="确认删除"
                cancelText="取消"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
              <Button onClick={onClose}>
                关闭
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Tabs
        items={tabItems}
        defaultActiveKey="info"
        type="card"
      />
    </Modal>
  );
};

export default DatasetDetails;
