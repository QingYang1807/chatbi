// 主内容区域组件

import React from 'react';
import { Layout, Modal, Tabs } from 'antd';
import { useUIStore, useDataStore } from '../../stores';
import MultiChatManager from '../Window/MultiChatManager';
import DataPreview from '../DataUpload/DataPreview';
import FileUploader from '../DataUpload/FileUploader';

import ModelConfig from '../Settings/ModelConfig';
import PreferencesPanel from '../Settings/PreferencesPanel';
import DataManagement from '../Settings/DataManagement';
import './MainContent.css';

const { Content } = Layout;

const MainContent: React.FC = () => {
  const {
    activePage,
    showDataUploadModal,
    HideDataUploadModal,
    showSettingsModal,
    HideSettingsModal,
  } = useUIStore();

  const { datasets, LoadDatasets } = useDataStore();

  React.useEffect(() => {
    // 应用启动时加载数据集
    LoadDatasets();
  }, [LoadDatasets]);

  const RenderMainContent = () => {
    switch (activePage) {
      case 'chat':
        return <MultiChatManager />;
      
      case 'data':
        return (
          <div className="data-page">
            {datasets.length === 0 ? (
              <div className="empty-state">
                <FileUploader allowMultiple={true} />
              </div>
            ) : (
              <div className="datasets-grid">
                {datasets.map((dataset) => (
                  <DataPreview key={dataset.id} dataset={dataset} />
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return <MultiChatManager />;
    }
  };

  const RenderSettingsContent = () => {
    const settingsTabItems = [
      {
        key: 'model',
        label: '模型配置',
        children: <ModelConfig />,
      },
      {
        key: 'preferences',
        label: '用户偏好',
        children: <PreferencesPanel />,
      },
      {
        key: 'data',
        label: '数据管理',
        children: <DataManagement />,
      },
    ];

    return (
      <div className="settings-content">
        <Tabs
          items={settingsTabItems}
          defaultActiveKey="model"
          type="card"
        />
      </div>
    );
  };

  return (
    <>
      <Content className="main-content">
        {RenderMainContent()}
      </Content>

      {/* 数据上传模态框 */}
      <Modal
        title="上传数据文件"
        open={showDataUploadModal}
        onCancel={HideDataUploadModal}
        footer={null}
        width={600}
        destroyOnClose
      >
        <FileUploader onUploadSuccess={HideDataUploadModal} allowMultiple={true} />
      </Modal>

      {/* 设置模态框 */}
      <Modal
        title="系统设置"
        open={showSettingsModal}
        onCancel={HideSettingsModal}
        footer={null}
        width={900}
        destroyOnClose
      >
        {RenderSettingsContent()}
      </Modal>
    </>
  );
};

export default MainContent;
