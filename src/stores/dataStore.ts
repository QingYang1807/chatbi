// 数据状态管理

import { create } from 'zustand';
import { DataSet, DataUploadResult } from '../types';
import { dataService } from '../services/dataService';
import { storageService } from '../services/storageService';
import { useChatStore } from './chatStore';

interface DataState {
  datasets: DataSet[];
  activeDataset?: DataSet;
  isUploading: boolean;
  uploadProgress: number;
  error?: string;

  // Actions
  UploadDataset: (file: File) => Promise<void>;
  SelectDataset: (datasetId: string) => void;
  DeleteDataset: (datasetId: string) => Promise<void>;
  LoadDatasets: () => Promise<void>;
  ClearError: () => void;
  GetDatasetById: (id: string) => DataSet | undefined;
  GetDatasetStats: (datasetId: string) => Record<string, any> | null;
}

export const useDataStore = create<DataState>((set, get) => ({
  datasets: [],
  activeDataset: undefined,
  isUploading: false,
  uploadProgress: 0,
  error: undefined,

  UploadDataset: async (file: File) => {
    set({ isUploading: true, uploadProgress: 0, error: undefined });

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        set((state) => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 80),
        }));
      }, 100);

      // 上传和处理文件
      const result: DataUploadResult = await dataService.UploadFile(file);

      clearInterval(progressInterval);

      if (!result.success || !result.dataset) {
        throw new Error(result.error || '文件上传失败');
      }

      const dataset = result.dataset;

      // 保存到本地存储
      await storageService.SaveDataset(dataset);

      // 更新状态
      set((state) => ({
        datasets: [...state.datasets, dataset],
        activeDataset: dataset,
        isUploading: false,
        uploadProgress: 100,
      }));

      // 设置为当前聊天的数据集
      useChatStore.getState().SetCurrentDataset(dataset.id);

      // 添加系统消息
      useChatStore.getState().AddMessage({
        type: 'system',
        content: `数据集 "${dataset.name}" 上传成功！包含 ${dataset.summary.totalRows} 行数据，${dataset.summary.totalColumns} 个字段。您现在可以开始分析这些数据了。`,
      });

    } catch (error) {
      console.error('数据集上传失败:', error);
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      
      set({
        isUploading: false,
        uploadProgress: 0,
        error: errorMessage,
      });

      // 添加错误消息到聊天
      useChatStore.getState().AddMessage({
        type: 'system',
        content: `数据集上传失败：${errorMessage}`,
        error: true,
      });
    }
  },

  SelectDataset: (datasetId: string) => {
    const dataset = get().GetDatasetById(datasetId);
    if (dataset) {
      set({ activeDataset: dataset });
      useChatStore.getState().SetCurrentDataset(datasetId);
      
      // 添加系统消息
      useChatStore.getState().AddMessage({
        type: 'system',
        content: `已切换到数据集 "${dataset.name}"`,
      });
    }
  },

  DeleteDataset: async (datasetId: string) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) return;

      // 从本地存储删除
      await storageService.DeleteDataset(datasetId);

      // 更新状态
      set((state) => {
        const updatedDatasets = state.datasets.filter(d => d.id !== datasetId);
        const newActiveDataset = state.activeDataset?.id === datasetId 
          ? (updatedDatasets.length > 0 ? updatedDatasets[0] : undefined)
          : state.activeDataset;

        return {
          datasets: updatedDatasets,
          activeDataset: newActiveDataset,
        };
      });

      // 更新聊天的当前数据集
      const newActiveDataset = get().activeDataset;
      useChatStore.getState().SetCurrentDataset(newActiveDataset?.id);

      // 添加系统消息
      useChatStore.getState().AddMessage({
        type: 'system',
        content: `数据集 "${dataset.name}" 已删除`,
      });

    } catch (error) {
      console.error('删除数据集失败:', error);
      set({ error: error instanceof Error ? error.message : '删除数据集失败' });
    }
  },

  LoadDatasets: async () => {
    try {
      const datasets = await storageService.GetDatasets();
      const activeDatasetId = storageService.GetActiveDataset();
      const activeDataset = activeDatasetId 
        ? datasets.find(d => d.id === activeDatasetId)
        : (datasets.length > 0 ? datasets[0] : undefined);

      set({
        datasets,
        activeDataset,
      });

      // 设置聊天的当前数据集
      if (activeDataset) {
        useChatStore.getState().SetCurrentDataset(activeDataset.id);
      }

    } catch (error) {
      console.error('加载数据集失败:', error);
      set({ error: error instanceof Error ? error.message : '加载数据集失败' });
    }
  },

  ClearError: () => {
    set({ error: undefined });
  },

  GetDatasetById: (id: string) => {
    return get().datasets.find(dataset => dataset.id === id);
  },

  GetDatasetStats: (datasetId: string) => {
    const dataset = get().GetDatasetById(datasetId);
    if (!dataset) return null;

    return dataService.GetDatasetStats(dataset);
  },
}));
