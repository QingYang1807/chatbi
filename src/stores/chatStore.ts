// 聊天状态管理

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatContext, AIResponse } from '../types';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';

interface ChatState {
  messages: ChatMessage[];
  currentDataset?: string;
  isLoading: boolean;
  error?: string;
  sessionId: string;

  // Actions
  AddMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  SendMessage: (content: string) => Promise<void>;
  ClearChat: () => void;
  LoadChatHistory: () => Promise<void>;
  SaveChatHistory: () => Promise<void>;
  SetCurrentDataset: (datasetId?: string) => void;
  SetError: (error?: string) => void;
  RetryLastMessage: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentDataset: undefined,
  isLoading: false,
  error: undefined,
  sessionId: uuidv4(),

  AddMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));

    // 自动保存聊天历史
    get().SaveChatHistory();
  },

  SendMessage: async (content: string) => {
    const state = get();
    
    // 添加用户消息
    state.AddMessage({
      type: 'user',
      content,
    });

    set({ isLoading: true, error: undefined });

    try {
      // 构建聊天上下文
      const context: ChatContext = {
        messages: state.messages,
        currentDataset: state.currentDataset,
        sessionId: state.sessionId,
      };

      // 发送消息到AI服务
      const aiResponse: AIResponse = await aiService.SendMessage(content, context, {
        includeDataAnalysis: !!state.currentDataset,
        suggestCharts: true,
      });

      // 添加AI回复
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        charts: aiResponse.charts?.map(chart => ({
          id: uuidv4(),
          type: chart.type,
          title: chart.title,
          data: chart.data,
          config: chart.config,
        })),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));

      // 保存聊天历史
      await get().SaveChatHistory();
    } catch (error) {
      console.error('发送消息失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '发送消息失败，请重试';
      
      // 添加错误消息
      state.AddMessage({
        type: 'assistant',
        content: `抱歉，${errorMessage}`,
        error: true,
      });

      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  ClearChat: () => {
    set({
      messages: [],
      error: undefined,
      sessionId: uuidv4(),
    });

    // 清除存储的聊天历史
    get().SaveChatHistory();
  },

  LoadChatHistory: async () => {
    try {
      const messages = await storageService.GetChatHistory();
      set({ messages });
    } catch (error) {
      console.error('加载聊天历史失败:', error);
    }
  },

  SaveChatHistory: async () => {
    try {
      const { messages } = get();
      await storageService.SaveChatHistory(messages);
    } catch (error) {
      console.error('保存聊天历史失败:', error);
    }
  },

  SetCurrentDataset: (datasetId) => {
    set({ currentDataset: datasetId });
    
    // 保存当前活动数据集
    if (datasetId) {
      storageService.SetActiveDataset(datasetId);
    }
  },

  SetError: (error) => {
    set({ error });
  },

  RetryLastMessage: async () => {
    const { messages } = get();
    
    // 找到最后一条用户消息
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.type === 'user');

    if (lastUserMessage) {
      // 移除最后一条错误的AI回复
      const filteredMessages = messages.filter(msg => 
        !(msg.type === 'assistant' && msg.error && msg.timestamp > lastUserMessage.timestamp)
      );
      
      set({ messages: filteredMessages });
      
      // 重新发送消息
      await get().SendMessage(lastUserMessage.content);
    }
  },
}));
