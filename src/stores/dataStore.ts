// 数据状态管理

import { create } from 'zustand';
import { DataSet, DataUploadResult, DatasetMetadata } from '../types';
import { dataService } from '../services/dataService';
import { storageService } from '../services/storageService';
import { useChatStore } from './chatStore';

interface DataState {
  datasets: DataSet[];
  activeDataset?: DataSet;
  activeDatasetMetadata?: DatasetMetadata; // 活动数据集的完整元数据
  isUploading: boolean;
  uploadProgress: number;
  error?: string;

  // Actions
  UploadDataset: (file: File) => Promise<void>;
  CreateDataset: (name: string, description?: string) => Promise<DataSet>;
  UpdateDataset: (dataset: DataSet) => Promise<void>;
  SelectDataset: (datasetId: string) => void;
  DeleteDataset: (datasetId: string) => Promise<void>;
  LoadDatasets: () => Promise<void>;
  ClearError: () => void;
  GetDatasetById: (id: string) => DataSet | undefined;
  GetDatasetStats: (datasetId: string) => Record<string, any> | null;
  
  // 数据内容编辑
  AddColumn: (datasetId: string, columnName: string, columnType: 'string' | 'number' | 'date' | 'boolean') => Promise<void>;
  DeleteColumn: (datasetId: string, columnName: string) => Promise<void>;
  RenameColumn: (datasetId: string, oldName: string, newName: string) => Promise<void>;
  AddRow: (datasetId: string, rowData: any) => Promise<void>;
  UpdateRow: (datasetId: string, rowIndex: number, rowData: any) => Promise<void>;
  DeleteRow: (datasetId: string, rowIndex: number) => Promise<void>;
  
  // Excel 工作表相关操作
  SwitchSheet: (datasetId: string, sheetIndex: number) => Promise<void>;
  GetSheetNames: (datasetId: string) => string[];
}

export const useDataStore = create<DataState>((set, get) => ({
  datasets: [],
  activeDataset: undefined,
  activeDatasetMetadata: undefined,
  isUploading: false,
  uploadProgress: 0,
  error: undefined,

  UploadDataset: async (file: File) => {
    console.log('🚀 开始上传数据集:', file.name, '类型:', file.type, '大小:', file.size);
    set({ isUploading: true, uploadProgress: 0, error: undefined });

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        set((state) => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 80),
        }));
      }, 100);

      console.log('📝 调用数据服务处理文件...');
      // 上传和处理文件
      const result: DataUploadResult = await dataService.UploadFile(file);

      clearInterval(progressInterval);
      console.log('📤 数据服务处理结果:', result);

      if (!result.success || !result.dataset) {
        console.error('❌ 数据处理失败:', result.error);
        throw new Error(result.error || '文件上传失败');
      }

      const dataset = result.dataset;
      console.log('✅ 数据集处理成功:', {
        id: dataset.id,
        name: dataset.name,
        rows: dataset.summary.totalRows,
        columns: dataset.summary.totalColumns
      });

      // 生成完整的元数据
      console.log('📊 生成数据集元数据...');
      const metadata = dataService.GenerateDatasetMetadata(dataset, file.size);
      console.log('✅ 元数据生成成功:', {
        qualityScore: metadata.quality.consistency.score,
        businessDomains: metadata.semantics.businessDomain,
        recommendedCharts: metadata.visualization.recommendedChartTypes
      });

      // 保存到本地存储
      console.log('💾 保存数据集到本地存储...');
      await storageService.SaveDataset(dataset);

      // 更新状态
      set((state) => ({
        datasets: [...state.datasets, dataset],
        activeDataset: dataset,
        activeDatasetMetadata: metadata,
        isUploading: false,
        uploadProgress: 100,
      }));

      console.log('🎯 设置为当前活动数据集');
      // 设置为当前聊天的数据集，并传递完整元数据
      useChatStore.getState().SetCurrentDatasetWithMetadata(dataset.id, metadata);

      // 同时更新多聊天存储中的当前活跃会话
      try {
        const multiChatStore = await import('./multiChatStore');
        const multiChatState = multiChatStore.useMultiChatStore.getState();
        
        // 获取所有会话
        const sessions = multiChatState.sessions;
        const sessionIds = Object.keys(sessions);
        
        if (sessionIds.length > 0) {
          // 找到当前活跃的会话（没有设置数据集或最新更新的会话）
          let activeSessionId = sessionIds.find(sessionId => {
            const session = sessions[sessionId];
            return !session.currentDataset;
          });
          
          // 如果没有找到未设置数据集的会话，选择最新更新的会话
          if (!activeSessionId) {
            const latestSession = sessionIds.reduce((latest, current) => {
              const latestSession = sessions[latest];
              const currentSession = sessions[current];
              return currentSession.updatedAt > latestSession.updatedAt ? current : latest;
            });
            activeSessionId = latestSession;
          }
          
          if (activeSessionId) {
            console.log('🎯 更新活跃会话数据集:', activeSessionId);
            multiChatState.SetSessionDataset(activeSessionId, dataset.id, metadata);
            
            // 添加系统消息到活跃会话
            multiChatState.AddMessage(activeSessionId, {
              type: 'system',
              content: `数据集 "${dataset.name}" 上传成功！包含 ${dataset.summary.totalRows} 行数据，${dataset.summary.totalColumns} 个字段。您现在可以开始分析这些数据了。`,
            });
          }
        }
      } catch (error) {
        console.warn('更新多聊天存储失败:', error);
      }

      // 添加系统消息到全局聊天存储
      useChatStore.getState().AddMessage({
        type: 'system',
        content: `数据集 "${dataset.name}" 上传成功！包含 ${dataset.summary.totalRows} 行数据，${dataset.summary.totalColumns} 个字段。您现在可以开始分析这些数据了。`,
      });

      console.log('🎉 数据集上传完成！');

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
      console.log('🗑️ 开始删除数据集:', datasetId);
      
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) {
        console.warn('⚠️ 数据集不存在:', datasetId);
        throw new Error('数据集不存在');
      }

      console.log('📋 找到要删除的数据集:', dataset.name);

      // 从本地存储删除
      await storageService.DeleteDataset(datasetId);
      console.log('💾 从存储中删除成功');

      // 更新状态
      set((state) => {
        const updatedDatasets = state.datasets.filter(d => d.id !== datasetId);
        const newActiveDataset = state.activeDataset?.id === datasetId 
          ? (updatedDatasets.length > 0 ? updatedDatasets[0] : undefined)
          : state.activeDataset;

        console.log('🔄 更新状态:', {
          删除前: state.datasets.length,
          删除后: updatedDatasets.length,
          新活动数据集: newActiveDataset?.name || '无'
        });

        return {
          datasets: updatedDatasets,
          activeDataset: newActiveDataset,
        };
      });

      // 更新聊天的当前数据集
      const newActiveDataset = get().activeDataset;
      const chatStore = useChatStore.getState();
      
      if (newActiveDataset) {
        chatStore.SetCurrentDataset(newActiveDataset.id);
        // 添加系统消息
        chatStore.AddMessage({
          type: 'system',
          content: `数据集 "${dataset.name}" 已删除，已切换到数据集 "${newActiveDataset.name}"`,
        });
      } else {
        // 如果没有其他数据集了，清除当前数据集关联并清空聊天记录
        chatStore.SetCurrentDataset(undefined);
        chatStore.ClearMessages();
        chatStore.AddMessage({
          type: 'system',
          content: `数据集 "${dataset.name}" 已删除。请上传新的数据文件开始分析。`,
        });
        
        // 清除存储中的活跃数据集状态
        await storageService.SetActiveDataset('');
      }

      console.log('✅ 数据集删除完成:', dataset.name);

    } catch (error) {
      console.error('❌ 删除数据集失败:', error);
      set({ error: error instanceof Error ? error.message : '删除数据集失败' });
      throw error; // 重新抛出错误，让调用方处理
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

  // 创建新数据集
  CreateDataset: async (name: string, description?: string) => {
    try {
      const dataset: DataSet = {
        id: Date.now().toString(),
        name,
        fileName: `${name}.csv`,
        description: description || `手动创建的数据集：${name}`,
        columns: [
          {
            name: '列1',
            type: 'string',
            nullable: true,
            unique: false,
            examples: ['示例数据']
          }
        ],
        rows: [
          { '列1': '示例数据' }
        ],
        summary: {
          totalRows: 1,
          totalColumns: 1,
          numericColumns: 0,
          stringColumns: 1,
          dateColumns: 0,
          missingValues: 0,
          duplicateRows: 0
        },
        uploadTime: new Date(),
        createdAt: new Date().toISOString(),
        size: 1
      };

      // 保存到本地存储
      await storageService.SaveDataset(dataset);

      // 更新状态
      set((state) => ({
        datasets: [...state.datasets, dataset],
        activeDataset: dataset,
      }));

      // 设置为当前活动数据集
      useChatStore.getState().SetCurrentDataset(dataset.id);

      console.log('✅ 数据集创建成功:', dataset.name);
      return dataset;

    } catch (error) {
      console.error('创建数据集失败:', error);
      set({ error: error instanceof Error ? error.message : '创建数据集失败' });
      throw error;
    }
  },

  // 更新数据集
  UpdateDataset: async (dataset: DataSet) => {
    try {
      // 重新生成统计信息
      const summary = dataService.GenerateDataSummary(dataset.rows, dataset.columns);
      const updatedDataset = {
        ...dataset,
        summary,
        updatedAt: new Date().toISOString()
      };

      // 保存到本地存储
      await storageService.UpdateDataset(updatedDataset);

      // 更新状态
      set((state) => ({
        datasets: state.datasets.map(d => 
          d.id === dataset.id ? updatedDataset : d
        ),
        activeDataset: state.activeDataset?.id === dataset.id ? updatedDataset : state.activeDataset
      }));

      console.log('✅ 数据集更新成功:', dataset.name);

    } catch (error) {
      console.error('更新数据集失败:', error);
      set({ error: error instanceof Error ? error.message : '更新数据集失败' });
      throw error;
    }
  },

  // 添加列
  AddColumn: async (datasetId: string, columnName: string, columnType: 'string' | 'number' | 'date' | 'boolean') => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      // 检查列名是否已存在
      if (dataset.columns.some(col => col.name === columnName)) {
        throw new Error('列名已存在');
      }

      // 添加新列到列定义
      const newColumn = {
        name: columnName,
        type: columnType,
        nullable: true,
        unique: false,
        examples: []
      };

      const updatedColumns = [...dataset.columns, newColumn];

      // 为所有行添加新列的默认值
      const defaultValue = columnType === 'number' ? 0 : 
                          columnType === 'boolean' ? false : 
                          columnType === 'date' ? new Date().toISOString() : '';

      const updatedRows = dataset.rows.map(row => ({
        ...row,
        [columnName]: defaultValue
      }));

      const updatedDataset = {
        ...dataset,
        columns: updatedColumns,
        rows: updatedRows
      };

      await get().UpdateDataset(updatedDataset);

    } catch (error) {
      console.error('添加列失败:', error);
      set({ error: error instanceof Error ? error.message : '添加列失败' });
      throw error;
    }
  },

  // 删除列
  DeleteColumn: async (datasetId: string, columnName: string) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      if (dataset.columns.length <= 1) {
        throw new Error('至少需要保留一列');
      }

      // 删除列定义
      const updatedColumns = dataset.columns.filter(col => col.name !== columnName);

      // 删除所有行中的对应列数据
      const updatedRows = dataset.rows.map(row => {
        const newRow = { ...row };
        delete newRow[columnName];
        return newRow;
      });

      const updatedDataset = {
        ...dataset,
        columns: updatedColumns,
        rows: updatedRows
      };

      await get().UpdateDataset(updatedDataset);

    } catch (error) {
      console.error('删除列失败:', error);
      set({ error: error instanceof Error ? error.message : '删除列失败' });
      throw error;
    }
  },

  // 重命名列
  RenameColumn: async (datasetId: string, oldName: string, newName: string) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      if (oldName === newName) return;

      // 检查新列名是否已存在
      if (dataset.columns.some(col => col.name === newName && col.name !== oldName)) {
        throw new Error('列名已存在');
      }

      // 更新列定义
      const updatedColumns = dataset.columns.map(col => 
        col.name === oldName ? { ...col, name: newName } : col
      );

      // 更新所有行中的列名
      const updatedRows = dataset.rows.map(row => {
        const newRow = { ...row };
        if (oldName in newRow) {
          newRow[newName] = newRow[oldName];
          delete newRow[oldName];
        }
        return newRow;
      });

      const updatedDataset = {
        ...dataset,
        columns: updatedColumns,
        rows: updatedRows
      };

      await get().UpdateDataset(updatedDataset);

    } catch (error) {
      console.error('重命名列失败:', error);
      set({ error: error instanceof Error ? error.message : '重命名列失败' });
      throw error;
    }
  },

  // 添加行
  AddRow: async (datasetId: string, rowData: any) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      // 确保新行包含所有列
      const newRow: any = {};
      dataset.columns.forEach(col => {
        newRow[col.name] = rowData[col.name] || 
          (col.type === 'number' ? 0 : 
           col.type === 'boolean' ? false : 
           col.type === 'date' ? new Date().toISOString() : '');
      });

      const updatedDataset = {
        ...dataset,
        rows: [...dataset.rows, newRow]
      };

      await get().UpdateDataset(updatedDataset);

    } catch (error) {
      console.error('添加行失败:', error);
      set({ error: error instanceof Error ? error.message : '添加行失败' });
      throw error;
    }
  },

  // 更新行
  UpdateRow: async (datasetId: string, rowIndex: number, rowData: any) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      if (rowIndex < 0 || rowIndex >= dataset.rows.length) {
        throw new Error('行索引超出范围');
      }

      const updatedRows = [...dataset.rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], ...rowData };

      const updatedDataset = {
        ...dataset,
        rows: updatedRows
      };

      await get().UpdateDataset(updatedDataset);

    } catch (error) {
      console.error('更新行失败:', error);
      set({ error: error instanceof Error ? error.message : '更新行失败' });
      throw error;
    }
  },

  // 删除行
  DeleteRow: async (datasetId: string, rowIndex: number) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      if (dataset.rows.length <= 1) {
        throw new Error('至少需要保留一行数据');
      }

      if (rowIndex < 0 || rowIndex >= dataset.rows.length) {
        throw new Error('行索引超出范围');
      }

      const updatedRows = dataset.rows.filter((_, index) => index !== rowIndex);

      const updatedDataset = {
        ...dataset,
        rows: updatedRows
      };

      await get().UpdateDataset(updatedDataset);

    } catch (error) {
      console.error('删除行失败:', error);
      set({ error: error instanceof Error ? error.message : '删除行失败' });
      throw error;
    }
  },

  // 切换工作表
  SwitchSheet: async (datasetId: string, sheetIndex: number) => {
    try {
      const dataset = get().GetDatasetById(datasetId);
      if (!dataset) throw new Error('数据集不存在');

      if (!dataset.sheets || dataset.sheets.length === 0) {
        throw new Error('该数据集没有多个工作表');
      }

      console.log(`🔄 切换到工作表 ${sheetIndex + 1}/${dataset.sheets.length}`);
      
      // 使用数据服务切换到指定工作表
      const updatedDataset = dataService.SwitchToSheet(dataset, sheetIndex);
      
      // 保存更新后的数据集
      await storageService.UpdateDataset(updatedDataset);

      // 更新状态
      set((state) => ({
        datasets: state.datasets.map(d => 
          d.id === datasetId ? updatedDataset : d
        ),
        activeDataset: state.activeDataset?.id === datasetId ? updatedDataset : state.activeDataset
      }));

      // 添加系统消息
      useChatStore.getState().AddMessage({
        type: 'system',
        content: `已切换到工作表 "${updatedDataset.sheets![sheetIndex].name}"`,
      });

      console.log('✅ 工作表切换成功:', updatedDataset.sheets![sheetIndex].name);

    } catch (error) {
      console.error('切换工作表失败:', error);
      set({ error: error instanceof Error ? error.message : '切换工作表失败' });
      throw error;
    }
  },

  // 获取工作表名称列表
  GetSheetNames: (datasetId: string) => {
    const dataset = get().GetDatasetById(datasetId);
    if (!dataset) return [];
    
    return dataService.GetSheetNames(dataset);
  },
}));
