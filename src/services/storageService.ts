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

  async DeleteDataset(datasetId: string): Promise<void> {
    try {
      const existingDatasets = await this.GetDatasets();
      const updatedDatasets = existingDatasets.filter(d => d.id !== datasetId);
      await this.SaveDatasetsToIndexedDB(updatedDatasets);
    } catch (error) {
      console.error('删除数据集失败:', error);
      throw new Error('删除数据集失败');
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
