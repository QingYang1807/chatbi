// Mermaid图表渲染组件

import React, { useState, useEffect } from 'react';
import { Alert } from 'antd';

interface MermaidRendererProps {
  code: string;
  title?: string;
  height?: number;
  className?: string;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  title,
  height = 400,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [diagramRendered, setDiagramRendered] = useState(false);

  useEffect(() => {
    const renderMermaidDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('📊 开始渲染Mermaid图表:', title || 'Untitled');
        console.log('🎯 Mermaid代码长度:', code.length);
        
        // 验证Mermaid代码
        if (!code || !code.trim()) {
          throw new Error('Mermaid代码为空');
        }

        // 清理和验证代码
        const cleanCode = code.trim();
        
        // 基本语法验证
        const validStartPatterns = [
          'graph', 'flowchart', 'sequenceDiagram', 'gantt', 'pie',
          'gitgraph', 'mindmap', 'timeline', 'quadrantChart', 'xyChart',
          'block-beta', 'erDiagram', 'journey', 'classDiagram', 'stateDiagram',
          'requirementDiagram', 'C4Context', 'C4Container', 'C4Component'
        ];
        
        const isValidSyntax = validStartPatterns.some(pattern => 
          cleanCode.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (!isValidSyntax) {
          console.warn('⚠️ 可能的Mermaid语法问题，但继续尝试渲染');
        }

        // 使用Mermaid.js的预期API（这里我们模拟，实际项目需要安装mermaid包）
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟异步渲染
        
        // setDiagramRendered(true);
        setIsLoading(false);
        
        console.log('✅ Mermaid图表渲染成功');
        
      } catch (err) {
        console.error('💥 Mermaid图表渲染失败:', err);
        setError(err instanceof Error ? err.message : '未知渲染错误');
        setIsLoading(false);
      }
    };

    renderMermaidDiagram();
  }, [code, title]);

  if (isLoading) {
    return (
      <div 
        className={`mermaid-loading ${className}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: `${height}px`,
          flexDirection: 'column',
          background: '#fafafa',
          borderRadius: '8px'
        }}
      >
        <div style={{ fontSize: '20px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontSize: '16px', color: '#1890ff', marginBottom: '8px' }}>
          正在渲染Mermaid图表...
        </div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          请稍候片刻
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mermaid-error ${className}`}>
        <Alert
          message="图表渲染失败"
          description={error}
          type="error"
          showIcon
          style={{ margin: '20px 0' }}
        />
        <div style={{
          background: '#f6f8fa',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #e1e4e8'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#666' }}>
            原始Mermaid代码：
          </div>
          <pre style={{
            fontSize: '12px',
            lineHeight: '1.5',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {code}
          </pre>
        </div>
      </div>
    );
  }

  // 渲染成功的情况
  return (
    <div className={`mermaid-container ${className}`}>
      {/* 模拟Mermaid渲染结果 */}
      <div 
        style={{
          minHeight: `${height}px`,
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0'
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
          {title && (
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#262626',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              {title}
            </div>
          )}
          <div style={{ 
            fontSize: '16px', 
            color: '#1890ff',
            marginBottom: '16px'
          }}>
            ✨ Mermaid图表已生成
          </div>
          <div style={{
            background: '#f6f8fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px dashed #d0d7de',
            width: '100%',
            maxWidth: '600px'
          }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#656d76',
              marginBottom: '12px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              📝 图表代码预览
            </div>
            <pre style={{
              fontSize: '12px',
              lineHeight: '1.4',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#24292f',
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
              maxHeight: '150px',
              overflow: 'auto'
            }}>
              {code.length > 300 ? `${code.substring(0, 300)}...` : code}
            </pre>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#8c8c8c',
            marginTop: '16px',
            textAlign: 'center'
          }}>
            🚀 在生产环境中，这里将显示真实的Mermaid图表
          </div>
        </div>
      </div>
    </div>
  );
};

export default MermaidRenderer;
