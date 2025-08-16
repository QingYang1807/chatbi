// 主内容区域组件

import React from 'react';
import { Layout, Modal } from 'antd';
import { useUIStore, useDataStore } from '../../stores';
import ChatContainer from '../Chat/ChatContainer';
import DataPreview from '../DataUpload/DataPreview';
import FileUploader from '../DataUpload/FileUploader';

import ModelConfig from '../Settings/ModelConfig';
import PreferencesPanel from '../Settings/PreferencesPanel';
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
        return <ChatContainer />;
      
      case 'data':
        return (
          <div className="data-page">
            {datasets.length === 0 ? (
              <div className="empty-state">
                <FileUploader />
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
        return <ChatContainer />;
    }
  };

  const RenderSettingsContent = () => {
    return (
      <div className="settings-content">
        <ModelConfig />
        <PreferencesPanel />
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
        <FileUploader onUploadSuccess={HideDataUploadModal} />
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
