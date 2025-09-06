// Mermaid图表渲染组件

import React, { useRef, useEffect, useState } from 'react';
import { Button, Space, message, Spin, Card } from 'antd';
import { CopyOutlined, DownloadOutlined, PictureOutlined, FileImageOutlined, ExpandOutlined } from '@ant-design/icons';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';
import './MermaidRenderer.css';

interface MermaidRendererProps {
  code: string;
  title?: string;
  className?: string;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ 
  code, 
  title = 'Mermaid图表', 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 初始化Mermaid配置
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      },
      sequence: {
        useMaxWidth: true,
        wrap: true
      },
      gantt: {
        useMaxWidth: true
      }
    });
  }, []);

  // 渲染Mermaid图表
  const RenderMermaid = async () => {
    if (!containerRef.current || !code.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // 清空容器
      containerRef.current.innerHTML = '';
      
      // 生成唯一ID
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 渲染Mermaid图表
      const { svg } = await mermaid.render(id, code);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        setIsRendered(true);
      }
    } catch (err: any) {
      console.error('Mermaid渲染错误:', err);
      setError(err.message || '渲染失败');
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="mermaid-error">
            <div class="error-icon">⚠️</div>
            <div class="error-title">图表渲染失败</div>
            <div class="error-message">${err.message || '请检查Mermaid语法是否正确'}</div>
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时渲染
  useEffect(() => {
    RenderMermaid();
  }, [code]);

  // 复制图片到剪贴板
  const CopyAsImage = async () => {
    if (!containerRef.current || !isRendered) {
      message.error('请先渲染图表');
      return;
    }

    try {
      setIsLoading(true);
      
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: containerRef.current.scrollWidth,
        height: containerRef.current.scrollHeight
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          message.error('生成图片失败');
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          message.success('图片已复制到剪贴板');
        } catch (clipboardError) {
          console.error('复制到剪贴板失败:', clipboardError);
          message.error('复制失败，请尝试下载图片');
        }
      });
    } catch (error) {
      console.error('生成图片失败:', error);
      message.error('生成图片失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 下载PNG图片
  const DownloadPNG = async () => {
    if (!containerRef.current || !isRendered) {
      message.error('请先渲染图表');
      return;
    }

    try {
      setIsLoading(true);
      
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          message.error('生成图片失败');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}-${new Date().getTime()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        message.success('PNG图片下载成功');
      });
    } catch (error) {
      console.error('下载PNG失败:', error);
      message.error('下载失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 下载SVG图片
  const DownloadSVG = () => {
    if (!containerRef.current || !isRendered) {
      message.error('请先渲染图表');
      return;
    }

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) {
      message.error('未找到SVG元素');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-${new Date().getTime()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('SVG图片下载成功');
    } catch (error) {
      console.error('下载SVG失败:', error);
      message.error('下载失败');
    }
  };

  // 全屏查看
  const ToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 关闭全屏（ESC键）
  useEffect(() => {
    const HandleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', HandleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', HandleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  const ActionButtons = () => (
    <Space size="small">
      <Button
        size="small"
        icon={<CopyOutlined />}
        onClick={CopyAsImage}
        disabled={!isRendered || isLoading}
        title="复制图片"
      >
        复制
      </Button>
      <Button
        size="small"
        icon={<PictureOutlined />}
        onClick={DownloadPNG}
        disabled={!isRendered || isLoading}
        title="下载PNG"
      >
        PNG
      </Button>
      <Button
        size="small"
        icon={<FileImageOutlined />}
        onClick={DownloadSVG}
        disabled={!isRendered || isLoading}
        title="下载SVG"
      >
        SVG
      </Button>
      <Button
        size="small"
        icon={<ExpandOutlined />}
        onClick={ToggleFullscreen}
        disabled={!isRendered}
        title="全屏查看"
      >
        全屏
      </Button>
    </Space>
  );

  return (
    <>
      <Card
        className={`mermaid-renderer ${className}`}
        title={
          <div className="mermaid-header">
            <span className="mermaid-title">📊 {title}</span>
            <ActionButtons />
          </div>
        }
        bodyStyle={{ padding: '16px' }}
        variant="outlined"
      >
        <div className="mermaid-container">
          <div 
            ref={containerRef} 
            className={`mermaid-content ${isLoading ? 'loading' : ''}`}
          />
          {isLoading && (
            <div className="mermaid-loading">
              <Spin size="large" />
              <p>正在渲染图表...</p>
            </div>
          )}
        </div>
      </Card>

      {/* 全屏模式 */}
      {isFullscreen && (
        <div className="mermaid-fullscreen-overlay" onClick={ToggleFullscreen}>
          <div className="mermaid-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <div className="mermaid-fullscreen-header">
              <span className="mermaid-fullscreen-title">{title}</span>
              <div className="mermaid-fullscreen-actions">
                <ActionButtons />
                <Button 
                  size="small" 
                  onClick={ToggleFullscreen}
                  style={{ marginLeft: '8px' }}
                >
                  关闭
                </Button>
              </div>
            </div>
            <div className="mermaid-fullscreen-body">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: containerRef.current?.innerHTML || '' 
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MermaidRenderer;