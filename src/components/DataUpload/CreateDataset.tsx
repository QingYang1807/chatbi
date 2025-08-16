// 创建数据集组件

import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space, 
  message,
  Card,
  Typography,
  Steps
} from 'antd';
import { 
  PlusOutlined, 
  FileAddOutlined,
  SettingOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useDataStore } from '../../stores';
import './CreateDataset.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

interface CreateDatasetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (datasetId: string) => void;
}

const CreateDataset: React.FC<CreateDatasetProps> = ({ 
  visible, 
  onClose, 
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { CreateDataset } = useDataStore();

  // 重置状态
  const ResetState = () => {
    setCurrentStep(0);
    setLoading(false);
    form.resetFields();
  };

  // 关闭模态框
  const HandleClose = () => {
    ResetState();
    onClose();
  };

  // 下一步
  const NextStep = async () => {
    try {
      if (currentStep === 0) {
        // 验证基本信息
        await form.validateFields(['name', 'description']);
        setCurrentStep(1);
      }
    } catch (error) {
      console.error('验证失败:', error);
    }
  };

  // 上一步
  const PrevStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  // 创建数据集
  const HandleCreate = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      console.log('🚀 开始创建数据集:', values);
      
      const dataset = await CreateDataset(values.name, values.description);
      
      message.success(`数据集 "${values.name}" 创建成功！`);
      
      // 跳转到最后一步
      setCurrentStep(2);
      
      // 延迟关闭并回调
      setTimeout(() => {
        HandleClose();
        onSuccess?.(dataset.id);
      }, 1500);
      
    } catch (error) {
      console.error('创建数据集失败:', error);
      message.error('创建失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 步骤配置
  const steps = [
    {
      title: '基本信息',
      icon: <FileAddOutlined />,
      description: '设置数据集名称和描述'
    },
    {
      title: '确认创建',
      icon: <SettingOutlined />,
      description: '确认创建配置'
    },
    {
      title: '创建完成',
      icon: <CheckOutlined />,
      description: '数据集创建成功'
    }
  ];

  // 渲染步骤内容
  const RenderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form
            form={form}
            layout="vertical"
            className="create-form"
          >
            <Form.Item
              name="name"
              label="数据集名称"
              rules={[
                { required: true, message: '请输入数据集名称' },
                { min: 2, max: 50, message: '名称长度应在2-50个字符之间' },
                { pattern: /^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_\s]*$/, message: '名称只能包含字母、数字、下划线、空格和中文，且不能以数字开头' }
              ]}
            >
              <Input 
                placeholder="请输入数据集名称，如：销售数据、用户行为分析等"
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="数据集描述"
              rules={[
                { max: 500, message: '描述长度不能超过500个字符' }
              ]}
            >
              <TextArea 
                placeholder="请描述这个数据集的用途、数据来源、主要字段等信息（可选）"
                rows={4}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </Form>
        );
        
      case 1:
        const values = form.getFieldsValue();
        return (
          <div className="confirm-content">
            <Card title="确认创建信息" className="confirm-card">
              <div className="confirm-item">
                <Text strong>数据集名称：</Text>
                <Text>{values.name}</Text>
              </div>
              <div className="confirm-item">
                <Text strong>描述信息：</Text>
                <Text type="secondary">
                  {values.description || '无描述'}
                </Text>
              </div>
            </Card>
            
            <Card title="默认配置" className="default-config">
              <ul>
                <li>初始包含1列1行的示例数据</li>
                <li>列名：列1（文本类型）</li>
                <li>示例数据：示例数据</li>
                <li>创建后可以通过数据编辑器修改结构和内容</li>
              </ul>
            </Card>
          </div>
        );
        
      case 2:
        return (
          <div className="success-content">
            <div className="success-icon">
              <CheckOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            </div>
            <Title level={3}>数据集创建成功！</Title>
            <Text type="secondary">
              您可以在数据管理页面查看和编辑新创建的数据集
            </Text>
          </div>
        );
        
      default:
        return null;
    }
  };

  // 渲染底部按钮
  const RenderFooter = () => {
    if (currentStep === 2) {
      return null; // 成功页面不显示按钮
    }

    return (
      <Space>
        {currentStep > 0 && (
          <Button onClick={PrevStep} disabled={loading}>
            上一步
          </Button>
        )}
        
        {currentStep === 0 && (
          <Button type="primary" onClick={NextStep}>
            下一步
          </Button>
        )}
        
        {currentStep === 1 && (
          <Button 
            type="primary" 
            onClick={HandleCreate} 
            loading={loading}
            icon={<PlusOutlined />}
          >
            创建数据集
          </Button>
        )}
        
        <Button onClick={HandleClose} disabled={loading}>
          {currentStep === 0 ? '取消' : '关闭'}
        </Button>
      </Space>
    );
  };

  return (
    <Modal
      title={
        <div className="modal-header">
          <FileAddOutlined />
          <span style={{ marginLeft: 8 }}>创建新数据集</span>
        </div>
      }
      open={visible}
      onCancel={HandleClose}
      width={600}
      footer={RenderFooter()}
      destroyOnClose
      maskClosable={false}
    >
      <div className="create-dataset">
        {/* 步骤指示器 */}
        <Steps 
          current={currentStep} 
          className="create-steps"
          size="small"
        >
          {steps.map((step, index) => (
            <Step 
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>
        
        {/* 步骤内容 */}
        <div className="step-content">
          {RenderStepContent()}
        </div>
      </div>
    </Modal>
  );
};

export default CreateDataset;
