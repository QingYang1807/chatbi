// Mermaid测试组件

import React, { useState } from 'react';
import { Card, Button, Input, Space, Divider, Typography, message } from 'antd';
import { PlayCircleOutlined, ClearOutlined, MessageOutlined } from '@ant-design/icons';
import MermaidRenderer from '../Visualization/MermaidRenderer';
import MessageBubble from '../Chat/MessageBubble';
import { ChatMessage } from '../../types';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const MermaidTest: React.FC = () => {
  const [mermaidCode, setMermaidCode] = useState(`graph TD
    A[开始] --> B{是否登录?}
    B -->|是| C[显示主页]
    B -->|否| D[显示登录页]
    C --> E[结束]
    D --> E`);

  const [showChart, setShowChart] = useState(true);
  const [testMessage, setTestMessage] = useState<ChatMessage | null>(null);

  const testExamples = [
    {
      title: '流程图示例',
      code: `graph TD
    A[开始] --> B{是否登录?}
    B -->|是| C[显示主页]
    B -->|否| D[显示登录页]
    C --> E[结束]
    D --> E`
    },
    {
      title: '序列图示例',
      code: `sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    
    用户->>前端: 登录请求
    前端->>后端: 验证用户信息
    后端->>数据库: 查询用户
    数据库-->>后端: 返回用户信息
    后端-->>前端: 登录结果
    前端-->>用户: 显示登录状态`
    },
    {
      title: '饼图示例',
      code: `pie title 销售分布
    "产品A" : 42.5
    "产品B" : 30.2
    "产品C" : 15.8
    "产品D" : 11.5`
    },
    {
      title: '甘特图示例',
      code: `gantt
    title 项目进度计划
    dateFormat YYYY-MM-DD
    section 需求分析
    需求收集          :done,    des1, 2024-01-01,2024-01-05
    需求分析          :done,    des2, 2024-01-06, 3d
    section 设计阶段
    系统设计          :active,  des3, 2024-01-10, 5d
    UI设计           :         des4, after des3, 3d
    section 开发阶段
    后端开发          :         des5, 2024-01-20, 10d
    前端开发          :         des6, after des5, 8d`
    },
    {
      title: '类图示例',
      code: `classDiagram
    class User {
        +String name
        +String email
        +Date createdAt
        +login()
        +logout()
    }
    class Product {
        +String title
        +Number price
        +String description
        +addToCart()
    }
    class Order {
        +String id
        +Date orderDate
        +Number total
        +calculateTotal()
    }
    User ||--o{ Order
    Order ||--o{ Product`
    }
  ];

  const HandleRender = () => {
    setShowChart(true);
  };

  const HandleClear = () => {
    setMermaidCode('');
    setShowChart(false);
  };

  const HandleExampleClick = (code: string) => {
    setMermaidCode(code);
    setShowChart(true);
  };

  const HandleCreateTestMessage = () => {
    if (!mermaidCode.trim()) {
      message.error('请输入Mermaid代码');
      return;
    }

    const messageContent = `这是一个包含Mermaid图表的测试消息：

\`\`\`mermaid
${mermaidCode}
\`\`\`

以上是Mermaid图表的效果展示。您可以看到完整的功能包括：
- ✅ 自动检测和渲染Mermaid代码块
- ✅ 复制图片到剪贴板
- ✅ 下载SVG和PNG格式
- ✅ 全屏查看模式
- ✅ 响应式设计`;

    const newMessage: ChatMessage = {
      id: `test-message-${Date.now()}`,
      type: 'assistant',
      content: messageContent,
      timestamp: new Date(),
    };

    setTestMessage(newMessage);
    message.success('测试消息已创建');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>🧪 Mermaid图表测试页面</Title>
      <Paragraph>
        测试Mermaid图表渲染功能，包括复制、下载SVG、下载PNG等功能。
      </Paragraph>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 左侧：代码编辑器 */}
        <Card title="📝 Mermaid代码编辑器" style={{ height: 'fit-content' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <TextArea
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              placeholder="在此输入Mermaid代码..."
              rows={15}
              style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
            />
            
            <Space>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={HandleRender}
              >
                渲染图表
              </Button>
              <Button 
                icon={<MessageOutlined />}
                onClick={HandleCreateTestMessage}
              >
                创建聊天测试
              </Button>
              <Button 
                icon={<ClearOutlined />}
                onClick={HandleClear}
              >
                清空
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 右侧：图表预览 */}
        <Card title="👀 图表预览" style={{ height: 'fit-content' }}>
          {showChart && mermaidCode.trim() ? (
            <MermaidRenderer 
              code={mermaidCode}
              title="测试图表"
            />
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#999',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
              <p>输入Mermaid代码并点击"渲染图表"查看效果</p>
            </div>
          )}
        </Card>
      </div>

      <Divider />

      {/* 示例代码 */}
      <Card title="📚 示例代码">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {testExamples.map((example, index) => (
            <Card 
              key={index}
              size="small"
              title={example.title}
              style={{ cursor: 'pointer' }}
              onClick={() => HandleExampleClick(example.code)}
              hoverable
            >
              <pre style={{ 
                fontSize: '12px',
                margin: 0,
                maxHeight: '120px',
                overflow: 'auto',
                background: '#f8f8f8',
                padding: '8px',
                borderRadius: '4px'
              }}>
                {example.code}
              </pre>
            </Card>
          ))}
        </div>
      </Card>

      <Divider />

      {/* 使用说明 */}
      <Card title="📖 使用说明">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Paragraph>
            <strong>功能特性：</strong>
          </Paragraph>
          <ul>
            <li>✅ 支持所有Mermaid图表类型（流程图、序列图、甘特图、类图等）</li>
            <li>✅ 复制图片到剪贴板功能</li>
            <li>✅ 下载SVG格式图片</li>
            <li>✅ 下载PNG格式图片</li>
            <li>✅ 全屏查看模式</li>
            <li>✅ 响应式设计，支持移动端</li>
          </ul>
          
          <Paragraph>
            <strong>在聊天中使用：</strong>
          </Paragraph>
          <ul>
            <li>在聊天消息中使用 <code>```mermaid</code> 代码块</li>
            <li>系统会自动检测并渲染Mermaid图表</li>
            <li>支持同一条消息中包含多个图表</li>
          </ul>
        </Space>
      </Card>

      {/* 聊天消息测试区域 */}
      {testMessage && (
        <>
          <Divider />
          <Card title="💬 聊天消息测试">
            <Paragraph>
              以下是在实际聊天中Mermaid图表的渲染效果：
            </Paragraph>
            <div style={{ 
              padding: '16px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <MessageBubble message={testMessage} />
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button 
                onClick={() => setTestMessage(null)}
                type="dashed"
              >
                清除测试消息
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default MermaidTest;
