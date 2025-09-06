// 窗口容器组件 - 支持Tab切换

import React, { useState, useRef } from 'react';
import { Tabs, Dropdown, Button, Input, Modal } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  CloseOutlined,
  SplitCellsOutlined,
  MessageOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { SplitPane as SplitPaneType, WindowType, SplitDirection } from '../../types/window';
import { useWindowStore } from '../../stores';
import ChatWindow from './ChatWindow';
import DataWindow from './DataWindow';
import './WindowContainer.css';

interface WindowContainerProps {
  pane: SplitPaneType;
}

const WindowContainer: React.FC<WindowContainerProps> = ({ pane }) => {
  const { 
    layout, 
    CreateWindow, 
    CloseWindow, 
    RenameWindow, 
    ActivateWindow, 
    SplitPane 
  } = useWindowStore();
  
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const draggedTabRef = useRef<string | null>(null);

  const windows = pane.children?.map(id => 
    typeof id === 'string' ? layout.windows[id] : null
  ).filter(Boolean) || [];

  const GetWindowIcon = (type: WindowType) => {
    switch (type) {
      case 'chat': return <MessageOutlined />;
      case 'data': return <DatabaseOutlined />;
      case 'visualization': return <BarChartOutlined />;
      case 'settings': return <SettingOutlined />;
      default: return <MessageOutlined />;
    }
  };

  const RenderWindowContent = (windowId: string) => {
    const window = layout.windows[windowId];
    if (!window) return null;

    switch (window.type) {
      case 'chat':
        return <ChatWindow windowId={windowId} />;
      case 'data':
        return <DataWindow windowId={windowId} />;
      case 'visualization':
        return <div>图表视图 - 待实现</div>;
      case 'settings':
        return <div>设置窗口 - 待实现</div>;
      default:
        return <div>未知窗口类型</div>;
    }
  };

  const HandleTabChange = (key: string) => {
    ActivateWindow(key);
  };

  const HandleTabEdit = (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => {
    if (action === 'add') {
      console.log('🆕 通过Tab编辑创建新对话窗口...');
      const windowId = CreateWindow('chat', '新建对话');
      console.log('✅ Tab编辑新对话窗口创建成功:', windowId);
    } else if (action === 'remove' && typeof targetKey === 'string') {
      const window = layout.windows[targetKey];
      if (window?.canClose !== false) {
        CloseWindow(targetKey);
      }
    }
  };

  const CreateNewWindowMenu = (): MenuProps['items'] => [
    {
      key: 'chat',
      label: '新建对话',
      icon: <MessageOutlined />,
      onClick: () => CreateWindow('chat', '新建对话'),
    },
    {
      key: 'data',
      label: '数据视图',
      icon: <DatabaseOutlined />,
      onClick: () => CreateWindow('data', '数据视图'),
    },
    {
      key: 'visualization',
      label: '图表视图',
      icon: <BarChartOutlined />,
      onClick: () => CreateWindow('visualization', '图表视图'),
    },
  ];

  const GetTabContextMenu = (windowId: string): MenuProps['items'] => {
    const window = layout.windows[windowId];
    if (!window) return [];

    const items: MenuProps['items'] = [];

    if (window.canRename !== false) {
      items.push({
        key: 'rename',
        label: '重命名',
        icon: <EditOutlined />,
        onClick: () => {
          setNewTitle(window.title);
          setShowRenameModal(windowId);
        },
      });
    }

    items.push(
      { type: 'divider' },
      {
        key: 'split-right',
        label: '向右分屏',
        icon: <SplitCellsOutlined />,
        onClick: () => HandleSplit('horizontal'),
      },
      {
        key: 'split-down',
        label: '向下分屏',
        icon: <SplitCellsOutlined />,
        onClick: () => HandleSplit('vertical'),
      }
    );

    if (window.canClose !== false) {
      items.push(
        { type: 'divider' },
        {
          key: 'close',
          label: '关闭',
          icon: <CloseOutlined />,
          onClick: () => CloseWindow(windowId),
        }
      );
    }

    return items;
  };

  const HandleSplit = (direction: SplitDirection) => {
    const newWindowId = CreateWindow('chat', '新建对话');
    SplitPane(pane.id, {
      direction,
      size: 0.5,
      newWindow: layout.windows[newWindowId]
    });
  };

  const HandleRename = () => {
    if (showRenameModal && newTitle.trim()) {
      RenameWindow(showRenameModal, newTitle.trim());
      setShowRenameModal(null);
      setNewTitle('');
    }
  };

  const HandleDragStart = (windowId: string) => {
    draggedTabRef.current = windowId;
  };

  const HandleDragOver = (e: React.DragEvent, windowId: string) => {
    e.preventDefault();
    setDragOverTab(windowId);
  };

  const HandleDragLeave = () => {
    setDragOverTab(null);
  };

  const HandleDrop = (e: React.DragEvent, targetWindowId: string) => {
    e.preventDefault();
    setDragOverTab(null);
    
    if (draggedTabRef.current && draggedTabRef.current !== targetWindowId) {
      // TODO: 实现Tab拖拽重排序
      console.log('拖拽重排序:', draggedTabRef.current, '到', targetWindowId);
    }
    
    draggedTabRef.current = null;
  };

  const tabItems = windows.map(window => ({
    key: window!.id,
    label: (
      <Dropdown
        menu={{ items: GetTabContextMenu(window!.id) }}
        trigger={['contextMenu']}
                        destroyOnHidden
      >
        <div 
          className={`tab-label ${dragOverTab === window!.id ? 'drag-over' : ''}`}
          draggable
          onDragStart={() => HandleDragStart(window!.id)}
          onDragOver={(e) => HandleDragOver(e, window!.id)}
          onDragLeave={HandleDragLeave}
          onDrop={(e) => HandleDrop(e, window!.id)}
        >
          {GetWindowIcon(window!.type)}
          <span className="tab-title">{window!.title}</span>
        </div>
      </Dropdown>
    ),
    children: RenderWindowContent(window!.id),
    closable: window!.canClose !== false,
  }));

  return (
    <div className="window-container">
      <Tabs
        type="editable-card"
        activeKey={pane.activeTabId}
        items={tabItems}
        onChange={HandleTabChange}
        onEdit={HandleTabEdit}
        size="small"
        className="window-tabs"
        tabBarExtraContent={{
          right: (
            <Dropdown menu={{ items: CreateNewWindowMenu() }} trigger={['click']}>
              <Button 
                type="text" 
                size="small" 
                icon={<PlusOutlined />}
                className="add-window-btn"
                title="创建新窗口"
              />
            </Dropdown>
          )
        }}
      />

      {/* 重命名模态框 */}
      <Modal
        title="重命名窗口"
        open={!!showRenameModal}
        onOk={HandleRename}
        onCancel={() => {
          setShowRenameModal(null);
          setNewTitle('');
        }}
        width={400}
                 destroyOnHidden
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="请输入新的窗口名称"
          onPressEnter={HandleRename}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default WindowContainer;
