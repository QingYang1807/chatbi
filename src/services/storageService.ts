// 本地存储服务

import { DataSet, ModelConfig, ChatMessage, UIPreferences } from '../types';

class StorageService {
  private readonly STORAGE_KEYS = {
    API_KEY: 'chatbi_api_key',
    MODEL_CONFIG: 'chatbi_model_config',
    UI_PREFERENCES: 'chatbi_ui_preferences',
    DATASETS: 'chatbi_datasets',
    CHAT_HISTORY: 'chatbi_chat_history',
    ACTIVE_DATASET: 'chatbi_active_dataset',
  };

  // API密钥管理
  SaveApiKey(apiKey: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.API_KEY, this.EncryptData(apiKey));
    } catch (error) {
      console.error('保存API密钥失败:', error);
      throw new Error('保存API密钥失败');
    }
  }

  GetApiKey(): string | null {
    try {
      const encryptedKey = localStorage.getItem(this.STORAGE_KEYS.API_KEY);
      return encryptedKey ? this.DecryptData(encryptedKey) : null;
    } catch (error) {
      console.error('获取API密钥失败:', error);
      return null;
    }
  }

  ClearApiKey(): void {
    localStorage.removeItem(this.STORAGE_KEYS.API_KEY);
  }

  // 模型配置管理
  SaveModelConfig(config: ModelConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.MODEL_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('保存模型配置失败:', error);
      throw new Error('保存模型配置失败');
    }
  }

  GetModelConfig(): ModelConfig | null {
    try {
      const configStr = localStorage.getItem(this.STORAGE_KEYS.MODEL_CONFIG);
      return configStr ? JSON.parse(configStr) : null;
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return null;
    }
  }

  // UI偏好设置管理
  SaveUIPreferences(preferences: UIPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.UI_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('保存UI偏好设置失败:', error);
      throw new Error('保存UI偏好设置失败');
    }
  }

  GetUIPreferences(): UIPreferences | null {
    try {
      const preferencesStr = localStorage.getItem(this.STORAGE_KEYS.UI_PREFERENCES);
      return preferencesStr ? JSON.parse(preferencesStr) : null;
    } catch (error) {
      console.error('获取UI偏好设置失败:', error);
      return null;
    }
  }

  // 数据集管理（使用IndexedDB存储大数据）
  async SaveDataset(dataset: DataSet): Promise<void> {
    try {
      const existingDatasets = await this.GetDatasets();
      const updatedDatasets = existingDatasets.filter(d => d.id !== dataset.id);
      updatedDatasets.push(dataset);
      await this.SaveDatasetsToIndexedDB(updatedDatasets);
    } catch (error) {
      console.error('保存数据集失败:', error);
      throw new Error('保存数据集失败');
    }
  }

  async GetDatasets(): Promise<DataSet[]> {
    try {
      return await this.GetDatasetsFromIndexedDB();
    } catch (error) {
      console.error('获取数据集失败:', error);
      return [];
    }
  }

  async UpdateDataset(dataset: DataSet): Promise<void> {
    try {
      const existingDatasets = await this.GetDatasets();
      const updatedDatasets = existingDatasets.map(d => 
        d.id === dataset.id ? { ...dataset, updatedAt: new Date().toISOString() } : d
      );
      await this.SaveDatasetsToIndexedDB(updatedDatasets);
    } catch (error) {
      console.error('更新数据集失败:', error);
      throw new Error('更新数据集失败');
    }
  }

  async DeleteDataset(datasetId: string): Promise<void> {
    try {
      console.log('🗄️ StorageService: 开始删除数据集', datasetId);
      
      const existingDatasets = await this.GetDatasets();
      console.log('📊 StorageService: 当前数据集数量:', existingDatasets.length);
      
      const datasetToDelete = existingDatasets.find(d => d.id === datasetId);
      if (!datasetToDelete) {
        console.warn('⚠️ StorageService: 数据集不存在于存储中:', datasetId);
        throw new Error('数据集不存在');
      }
      
      console.log('📋 StorageService: 找到要删除的数据集:', datasetToDelete.name);
      
      const updatedDatasets = existingDatasets.filter(d => d.id !== datasetId);
      console.log('🔄 StorageService: 过滤后数据集数量:', updatedDatasets.length);
      
      await this.SaveDatasetsToIndexedDB(updatedDatasets);
      console.log('✅ StorageService: 数据集删除成功');
      
    } catch (error) {
      console.error('❌ StorageService: 删除数据集失败:', error);
      throw new Error('删除数据集失败');
    }
  }

  async GetDatasetById(datasetId: string): Promise<DataSet | null> {
    try {
      const datasets = await this.GetDatasets();
      return datasets.find(d => d.id === datasetId) || null;
    } catch (error) {
      console.error('获取数据集失败:', error);
      return null;
    }
  }

  // 当前活动数据集
  SetActiveDataset(datasetId: string): void {
    localStorage.setItem(this.STORAGE_KEYS.ACTIVE_DATASET, datasetId);
  }

  GetActiveDataset(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.ACTIVE_DATASET);
  }

  // 聊天历史管理
  async SaveChatHistory(messages: ChatMessage[]): Promise<void> {
    try {
      await this.SaveChatHistoryToIndexedDB(messages);
    } catch (error) {
      console.error('保存聊天历史失败:', error);
      throw new Error('保存聊天历史失败');
    }
  }

  async GetChatHistory(): Promise<ChatMessage[]> {
    try {
      return await this.GetChatHistoryFromIndexedDB();
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      return [];
    }
  }

  async ClearChatHistory(): Promise<void> {
    try {
      await this.SaveChatHistoryToIndexedDB([]);
    } catch (error) {
      console.error('清除聊天历史失败:', error);
      throw new Error('清除聊天历史失败');
    }
  }

  // 清除所有数据
  async ClearAllData(): Promise<void> {
    try {
      localStorage.clear();
      await this.ClearIndexedDB();
    } catch (error) {
      console.error('清除所有数据失败:', error);
      throw new Error('清除所有数据失败');
    }
  }

  // 导出所有数据
  async ExportAllData(): Promise<string> {
    try {
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: {
          modelConfig: this.GetModelConfig(),
          uiPreferences: this.GetUIPreferences(),
          apiKey: this.GetApiKey(),
          activeDataset: this.GetActiveDataset(),
        },
        datasets: await this.GetDatasets(),
        chatHistory: await this.GetChatHistory(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('导出数据失败:', error);
      throw new Error('导出数据失败');
    }
  }

  // 导入数据
  async ImportAllData(dataJson: string): Promise<void> {
    try {
      const importData = JSON.parse(dataJson);
      
      // 验证数据格式
      if (!importData.version || !importData.timestamp) {
        throw new Error('无效的备份文件格式');
      }

      console.log('📥 开始导入数据...');
      
      // 导入设置
      if (importData.settings) {
        if (importData.settings.modelConfig) {
          this.SaveModelConfig(importData.settings.modelConfig);
        }
        
        if (importData.settings.uiPreferences) {
          this.SaveUIPreferences(importData.settings.uiPreferences);
        }
        
        if (importData.settings.apiKey) {
          this.SaveApiKey(importData.settings.apiKey);
        }
        
        if (importData.settings.activeDataset) {
          this.SetActiveDataset(importData.settings.activeDataset);
        }
      }

      // 导入数据集
      if (importData.datasets && Array.isArray(importData.datasets)) {
        await this.SaveDatasetsToIndexedDB(importData.datasets);
      }

      // 导入聊天历史
      if (importData.chatHistory && Array.isArray(importData.chatHistory)) {
        await this.SaveChatHistoryToIndexedDB(importData.chatHistory);
      }

      console.log('✅ 数据导入完成');
      
    } catch (error) {
      console.error('导入数据失败:', error);
      throw new Error(`导入数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 下载备份文件
  DownloadBackup(data: string, filename?: string): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = filename || `chatbi-backup-${timestamp}.json`;
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      console.log('💾 备份文件下载完成:', fileName);
    } catch (error) {
      console.error('下载备份文件失败:', error);
      throw new Error('下载备份文件失败');
    }
  }

  // 读取上传的备份文件
  ReadBackupFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        reject(new Error('请选择JSON格式的备份文件'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          resolve(content);
        } catch (error) {
          reject(new Error('读取文件失败'));
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取错误'));
      reader.readAsText(file);
    });
  }

  // 简单的加密/解密（生产环境需要更强的加密）
  private EncryptData(data: string): string {
    return btoa(data);
  }

  private DecryptData(encryptedData: string): string {
    return atob(encryptedData);
  }

  // IndexedDB操作
  private async SaveDatasetsToIndexedDB(datasets: DataSet[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatBI', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chatHistory')) {
          db.createObjectStore('chatHistory', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['datasets'], 'readwrite');
        const store = transaction.objectStore('datasets');
        
        // 清除现有数据
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          // 添加新数据
          datasets.forEach(dataset => {
            store.add(dataset);
          });
        };
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  private async GetDatasetsFromIndexedDB(): Promise<DataSet[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatBI', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chatHistory')) {
          db.createObjectStore('chatHistory', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['datasets'], 'readonly');
        const store = transaction.objectStore('datasets');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result || []);
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  private async SaveChatHistoryToIndexedDB(messages: ChatMessage[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatBI', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chatHistory')) {
          db.createObjectStore('chatHistory', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['chatHistory'], 'readwrite');
        const store = transaction.objectStore('chatHistory');
        
        // 清除现有数据
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          // 添加新数据
          messages.forEach(message => {
            store.add(message);
          });
        };
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  private async GetChatHistoryFromIndexedDB(): Promise<ChatMessage[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatBI', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chatHistory')) {
          db.createObjectStore('chatHistory', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['chatHistory'], 'readonly');
        const store = transaction.objectStore('chatHistory');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result || []);
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  private async ClearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatBI', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['datasets', 'chatHistory'], 'readwrite');
        
        transaction.objectStore('datasets').clear();
        transaction.objectStore('chatHistory').clear();
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }
}

export const storageService = new StorageService();
