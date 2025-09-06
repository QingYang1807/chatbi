// 安全的窗口容器组件 - 基于WindowContainer优化

import React, { useState } from 'react';
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
import SafeChatWindow from './SafeChatWindow';
import './WindowContainer.css';

interface SafeWindowContainerProps {
  pane: SplitPaneType;
}

const SafeWindowContainer: React.FC<SafeWindowContainerProps> = ({ pane }) => {
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
        return <SafeChatWindow windowId={windowId} />;
      case 'data':
        return <div>数据视图 - 待实现</div>;
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
      onClick: () => {
        console.log('🆕 创建新对话窗口...');
        const windowId = CreateWindow('chat', '新建对话');
        console.log('✅ 新对话窗口创建成功:', windowId);
      },
    },
    {
      key: 'data',
      label: '数据视图',
      icon: <DatabaseOutlined />,
      onClick: () => {
        console.log('🆕 创建数据视图窗口...');
        const windowId = CreateWindow('data', '数据视图');
        console.log('✅ 数据视图窗口创建成功:', windowId);
      },
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

  const tabItems = windows.map(window => ({
    key: window!.id,
    label: (
      <Dropdown
        menu={{ items: GetTabContextMenu(window!.id) }}
        trigger={['contextMenu']}
                        destroyOnHidden
      >
        <div className="tab-label">
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
        destroyOnClose
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

export default SafeWindowContainer;
