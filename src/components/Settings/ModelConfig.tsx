// 模型配置组件

import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Space, Typography, Tag, Divider } from 'antd';
import { KeyOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { GLMModel } from '../../types';
import { useSettingsStore } from '../../stores';
import { aiService } from '../../services/aiService';
import './ModelConfig.css';


const { Title, Text, Paragraph } = Typography;
const { Password } = Input;

const ModelConfig: React.FC = () => {
  const {
    modelConfig,
    apiKeyValid,
    isValidating,
    lastApiCheck,
    UpdateModelConfig,
    ValidateApiKey,
    SwitchModel,
    ClearApiKey,
  } = useSettingsStore();

  const [form] = Form.useForm();
  const [localApiKey, setLocalApiKey] = useState('');

  const supportedModels = aiService.GetSupportedModels();

  const HandleModelChange = async (model: GLMModel) => {
    await SwitchModel(model);
    const modelInfo = aiService.GetModelInfo(model);
    form.setFieldsValue({
      maxTokens: modelInfo.maxTokens,
    });
  };

  const HandleApiKeyUpdate = async () => {
    if (!localApiKey.trim()) return;

    await UpdateModelConfig({
      apiKey: localApiKey.trim(),
    });

    setLocalApiKey('');
  };

  const HandleValidateKey = async () => {
    await ValidateApiKey();
  };

  const HandleConfigUpdate = async (changedFields: any) => {
    await UpdateModelConfig(changedFields);
  };

  const GetModelStatusColor = () => {
    if (isValidating) return 'processing';
    if (apiKeyValid) return 'success';
    if (modelConfig.apiKey) return 'error';
    return 'default';
  };

  const GetModelStatusText = () => {
    if (isValidating) return '验证中...';
    if (apiKeyValid) return '已连接';
    if (modelConfig.apiKey) return '连接失败';
    return '未配置';
  };

  const RenderModelCard = (model: GLMModel) => {
    const modelInfo = aiService.GetModelInfo(model);
    const isSelected = modelConfig.name === model;

    return (
      <Card
        key={model}
        className={`model-card ${isSelected ? 'selected' : ''}`}
        size="small"
        title={
          <Space>
            <span>{modelInfo.name}</span>
            {isSelected && <Tag color="success">当前</Tag>}
          </Space>
        }
        extra={
          !isSelected && (
            <Button
              size="small"
              type="primary"
              onClick={() => HandleModelChange(model)}
            >
              选择
            </Button>
          )
        }
      >
        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
          {modelInfo.description}
        </Paragraph>
        <div className="model-meta">
          <Text type="secondary" style={{ fontSize: 12 }}>
            最大Token: {modelInfo.maxTokens.toLocaleString()}
          </Text>
        </div>
      </Card>
    );
  };

  return (
    <div className="model-config">
      <Card title="AI模型配置" className="config-card">
        {/* 模型状态 */}
        <div className="model-status">
          <Space>
            <Tag color={GetModelStatusColor()} icon={apiKeyValid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}>
              {GetModelStatusText()}
            </Tag>
            {lastApiCheck && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                最后检查: {lastApiCheck.toLocaleTimeString()}
              </Text>
            )}
          </Space>
        </div>

        {/* API密钥配置 */}
        <div className="api-key-section">
          <Title level={5}>
            <KeyOutlined /> API密钥配置
          </Title>
          
          {!modelConfig.apiKey ? (
            <Alert
              message="请配置API密钥"
              description="您需要在智谱AI平台获取API密钥才能使用ChatBI功能"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : !apiKeyValid ? (
            <Alert
              message="API密钥无效"
              description="请检查您的API密钥是否正确，或者检查网络连接"
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert
              message="API密钥有效"
              description="您的API密钥工作正常，可以开始使用ChatBI"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Space.Compact style={{ width: '100%' }}>
            <Password
              placeholder="请输入智谱AI API密钥"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              onClick={HandleApiKeyUpdate}
              disabled={!localApiKey.trim()}
            >
              更新
            </Button>
          </Space.Compact>

          <div className="api-key-actions">
            <Space>
              {modelConfig.apiKey && (
                <Button
                  onClick={HandleValidateKey}
                  loading={isValidating}
                  size="small"
                >
                  重新验证
                </Button>
              )}
              {modelConfig.apiKey && (
                <Button
                  onClick={ClearApiKey}
                  danger
                  size="small"
                >
                  清除密钥
                </Button>
              )}
            </Space>
          </div>

          <div className="api-key-help">
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 如何获取API密钥：访问 <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer">智谱AI开放平台</a> 注册账号并创建API密钥
            </Text>
          </div>
        </div>

        <Divider />

        {/* 模型选择 */}
        <div className="model-selection">
          <Title level={5}>模型选择</Title>
          <div className="models-grid">
            {supportedModels.map(RenderModelCard)}
          </div>
        </div>

        <Divider />

        {/* 高级配置 */}
        <div className="advanced-config">
          <Title level={5}>高级配置</Title>
          <Form
            form={form}
            layout="vertical"
            initialValues={modelConfig}
            onValuesChange={(changedFields) => HandleConfigUpdate(changedFields)}
          >
            <Form.Item
              label="最大Token数"
              name="maxTokens"
              help="控制生成文本的最大长度，值越大生成内容越长，但消耗更多资源"
            >
              <Input
                type="number"
                min={100}
                max={4096}
                style={{ width: 200 }}
              />
            </Form.Item>

            <Form.Item
              label="温度参数"
              name="temperature"
              help="控制生成文本的随机性，0.1为较保守，0.9为较创新"
            >
              <Input
                type="number"
                min={0.1}
                max={1.0}
                step={0.1}
                style={{ width: 200 }}
              />
            </Form.Item>

            <Form.Item
              label="API端点"
              name="endpoint"
              help="智谱AI API的访问地址，通常不需要修改"
            >
              <Input style={{ width: 400 }} />
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default ModelConfig;
