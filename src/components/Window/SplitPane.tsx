// 分屏面板组件

import React, { useState, useRef, useCallback } from 'react';
import { SplitPane as SplitPaneType, SplitDirection } from '../../types/window';
import { useWindowStore } from '../../stores';
import WindowContainer from './WindowContainer';
import SafeWindowContainer from './SafeWindowContainer';
import './SplitPane.css';

interface SplitPaneProps {
  pane: SplitPaneType;
  isRoot?: boolean;
}

const SplitPane: React.FC<SplitPaneProps> = ({ pane, isRoot = false }) => {
  const { ResizePane } = useWindowStore();
  const [isDragging, setIsDragging] = useState(false);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number; size: number }>({ x: 0, y: 0, size: 0 });

  const HandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const rect = splitPaneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      size: pane.size || 0.5
    };

    const HandleMouseMove = (moveEvent: MouseEvent) => {
      if (!splitPaneRef.current) return;
      
      const rect = splitPaneRef.current.getBoundingClientRect();
      let newSize: number;
      
      if (pane.direction === 'horizontal') {
        const deltaX = moveEvent.clientX - startPosRef.current.x;
        const sizeChange = deltaX / rect.width;
        newSize = Math.max(0.1, Math.min(0.9, startPosRef.current.size + sizeChange));
      } else {
        const deltaY = moveEvent.clientY - startPosRef.current.y;
        const sizeChange = deltaY / rect.height;
        newSize = Math.max(0.1, Math.min(0.9, startPosRef.current.size + sizeChange));
      }
      
      ResizePane(pane.id, newSize);
    };

    const HandleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', HandleMouseMove);
      document.removeEventListener('mouseup', HandleMouseUp);
    };

    document.addEventListener('mousemove', HandleMouseMove);
    document.addEventListener('mouseup', HandleMouseUp);
  }, [pane.id, pane.direction, pane.size, ResizePane]);

  if (pane.type === 'tabs') {
    return <SafeWindowContainer pane={pane} />;
  }

  if (pane.type === 'split' && pane.children && pane.children.length >= 2) {
    const [firstChild, secondChild] = pane.children;
    const size = pane.size || 0.5;
    
    const isHorizontal = pane.direction === 'horizontal';
    const firstStyle = isHorizontal 
      ? { width: `${size * 100}%`, height: '100%' }
      : { width: '100%', height: `${size * 100}%` };
    const secondStyle = isHorizontal
      ? { width: `${(1 - size) * 100}%`, height: '100%' }
      : { width: '100%', height: `${(1 - size) * 100}%` };

    return (
      <div 
        ref={splitPaneRef}
        className={`split-pane ${isHorizontal ? 'horizontal' : 'vertical'} ${isRoot ? 'root' : ''}`}
      >
        <div className="split-pane-child first" style={firstStyle}>
          {typeof firstChild === 'string' ? (
            <SafeWindowContainer pane={{ 
              id: `temp-${firstChild}`, 
              type: 'tabs', 
              children: [firstChild], 
              activeTabId: firstChild 
            }} />
          ) : (
            <SplitPane pane={firstChild} />
          )}
        </div>
        
        <div 
          className={`split-resizer ${isHorizontal ? 'horizontal' : 'vertical'} ${isDragging ? 'dragging' : ''}`}
          onMouseDown={HandleMouseDown}
        >
          <div className="split-resizer-line" />
        </div>
        
        <div className="split-pane-child second" style={secondStyle}>
          {typeof secondChild === 'string' ? (
            <SafeWindowContainer pane={{ 
              id: `temp-${secondChild}`, 
              type: 'tabs', 
              children: [secondChild], 
              activeTabId: secondChild 
            }} />
          ) : (
            <SplitPane pane={secondChild} />
          )}
        </div>
      </div>
    );
  }

  // 如果没有有效的子元素，返回空的窗口容器
  return <SafeWindowContainer pane={pane} />;
};

export default SplitPane;
