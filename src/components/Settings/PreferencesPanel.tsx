// 偏好设置组件

import React from 'react';
import { Card, Form, Switch, Select, Button, Divider, Typography, Space, Alert } from 'antd';
import { SettingOutlined, BulbOutlined, GlobalOutlined } from '@ant-design/icons';
import { useSettingsStore, useUIStore } from '../../stores';
import './PreferencesPanel.css';

const { Option } = Select;
const { Title, Text } = Typography;

const PreferencesPanel: React.FC = () => {
  const { uiPreferences, UpdateUIPreferences, ResetSettings } = useSettingsStore();
  const { AddNotification } = useUIStore();

  const [form] = Form.useForm();

  const HandlePreferenceChange = (changedFields: any) => {
    UpdateUIPreferences(changedFields);
    
    // 如果是主题切换，显示特殊提示
    if (changedFields.theme) {
      const themeNames: Record<string, string> = {
        light: '浅色模式',
        dark: '深色模式',
        auto: '跟随系统'
      };
      AddNotification({
        type: 'success',
        title: '主题已切换',
        message: `已切换到${themeNames[changedFields.theme] || '未知主题'}`,
        duration: 2000,
      });
    } else {
      // 显示保存成功提示
      AddNotification({
        type: 'success',
        title: '设置已保存',
        message: '您的偏好设置已自动保存',
        duration: 2000,
      });
    }
  };

  const HandleResetSettings = () => {
    ResetSettings();
    form.resetFields();
    
    AddNotification({
      type: 'info',
      title: '设置已重置',
      message: '所有设置已恢复到默认值',
      duration: 3000,
    });
  };

  return (
    <div className="preferences-panel">
      <Card title="用户偏好设置" className="preferences-card">
        <Form
          form={form}
          layout="vertical"
          initialValues={uiPreferences}
          onValuesChange={HandlePreferenceChange}
        >
          {/* 外观设置 */}
          <div className="preference-section">
            <Title level={5}>
              <BulbOutlined /> 外观设置
            </Title>
            
            <Form.Item
              label="主题模式"
              name="theme"
              help="选择您喜欢的界面主题"
            >
              <Select style={{ width: 200 }}>
                <Option value="light">浅色模式</Option>
                <Option value="dark">深色模式</Option>
                <Option value="auto">跟随系统</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="界面语言"
              name="language"
              help="选择界面显示语言"
            >
              <Select style={{ width: 200 }}>
                <Option value="zh">简体中文</Option>
                <Option value="en">English</Option>
              </Select>
            </Form.Item>
          </div>

          <Divider />

          {/* 功能设置 */}
          <div className="preference-section">
            <Title level={5}>
              <SettingOutlined /> 功能设置
            </Title>

            <Form.Item
              label="自动生成图表"
              name="autoGenerateCharts"
              valuePropName="checked"
              help="AI分析数据时自动生成合适的图表"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="显示数据预览"
              name="showDataPreview"
              valuePropName="checked"
              help="上传数据后自动显示数据预览"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="启用通知"
              name="enableNotifications"
              valuePropName="checked"
              help="启用系统通知和提示"
            >
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          {/* 数据和隐私 */}
          <div className="preference-section">
            <Title level={5}>
              <GlobalOutlined /> 数据和隐私
            </Title>

            <Alert
              message="数据安全承诺"
              description={
                <div>
                  <p>• 所有数据处理都在您的浏览器本地完成</p>
                  <p>• 我们不会将您的原始数据发送到服务器</p>
                  <p>• 只有脱敏的分析请求会发送给AI模型</p>
                  <p>• 您可以随时清除本地存储的数据</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                onClick={() => {
                  localStorage.clear();
                  AddNotification({
                    type: 'success',
                    title: '缓存已清除',
                    message: '本地缓存数据已清除',
                  });
                }}
              >
                清除浏览器缓存
              </Button>
              
              <Button 
                onClick={() => {
                  // 清除IndexedDB数据
                  indexedDB.deleteDatabase('ChatBI');
                  AddNotification({
                    type: 'success',
                    title: '数据已清除',
                    message: '所有本地数据已清除',
                  });
                }}
              >
                清除所有本地数据
              </Button>
            </Space>
          </div>

          <Divider />

          {/* 重置设置 */}
          <div className="preference-section">
            <Title level={5}>重置设置</Title>
            <Text type="secondary">
              将所有设置恢复到默认值，包括API密钥和用户偏好
            </Text>
            <div style={{ marginTop: 12 }}>
              <Button danger onClick={HandleResetSettings}>
                重置所有设置
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default PreferencesPanel;
