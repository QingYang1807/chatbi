// 多会话聊天状态管理

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatContext, AIResponse, DatasetMetadata } from '../types';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  currentDataset?: string;
  currentDatasetMetadata?: DatasetMetadata;
  isLoading: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MultiChatState {
  sessions: Record<string, ChatSession>;
  
  // Actions
  CreateSession: (name?: string, datasetId?: string) => string;
  DeleteSession: (sessionId: string) => void;
  RenameSession: (sessionId: string, newName: string) => void;
  AddMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  SendMessage: (sessionId: string, content: string) => Promise<void>;
  ClearSession: (sessionId: string) => void;
  SetSessionDataset: (sessionId: string, datasetId?: string, metadata?: DatasetMetadata) => void;
  SetSessionError: (sessionId: string, error?: string) => void;
  RetryLastMessage: (sessionId: string) => Promise<void>;
  
  // Session management
  LoadSessions: () => Promise<void>;
  SaveSessions: () => Promise<void>;
  SaveSession: (sessionId: string) => Promise<void>;
  
  // Helper methods
  GetSession: (sessionId: string) => ChatSession | undefined;
  GetSessionMessages: (sessionId: string) => ChatMessage[];
  GetSessionLoading: (sessionId: string) => boolean;
  GetSessionError: (sessionId: string) => string | undefined;
}

const CreateDefaultSession = (name?: string, datasetId?: string): ChatSession => ({
  id: uuidv4(),
  name: name || `对话 ${new Date().toLocaleTimeString()}`,
  messages: [],
  currentDataset: datasetId,
  isLoading: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useMultiChatStore = create<MultiChatState>((set, get) => ({
  sessions: {},

  CreateSession: (name?: string, datasetId?: string) => {
    const session = CreateDefaultSession(name, datasetId);
    
    set((state) => ({
      sessions: {
        ...state.sessions,
        [session.id]: session
      }
    }));

    // 自动保存
    get().SaveSession(session.id);
    return session.id;
  },

  DeleteSession: (sessionId: string) => {
    set((state) => {
      const newSessions = { ...state.sessions };
      delete newSessions[sessionId];
      return { sessions: newSessions };
    });

    // 保存更改
    get().SaveSessions();
  },

  RenameSession: (sessionId: string, newName: string) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            name: newName,
            updatedAt: new Date()
          }
        }
      };
    });

    get().SaveSession(sessionId);
  },

  AddMessage: (sessionId: string, message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };

    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, newMessage],
            updatedAt: new Date()
          }
        }
      };
    });

    // 自动保存会话
    get().SaveSession(sessionId);
  },

  SendMessage: async (sessionId: string, content: string) => {
    const state = get();
    const session = state.sessions[sessionId];
    if (!session) return;
    
    // 添加用户消息
    state.AddMessage(sessionId, {
      type: 'user',
      content,
    });

    // 设置加载状态
    set((prevState) => ({
      sessions: {
        ...prevState.sessions,
        [sessionId]: {
          ...prevState.sessions[sessionId],
          isLoading: true,
          error: undefined
        }
      }
    }));

    try {
      // 获取当前数据集的完整信息
      let currentDatasetData = null;
      if (session.currentDataset) {
        const dataStore = await import('./dataStore');
        currentDatasetData = dataStore.useDataStore.getState().GetDatasetById(session.currentDataset);
      }

      // 构建聊天上下文
      const updatedSession = get().sessions[sessionId];
      const context: ChatContext = {
        messages: updatedSession.messages,
        currentDataset: session.currentDataset,
        currentDatasetData: currentDatasetData,
        currentDatasetMetadata: session.currentDatasetMetadata,
        sessionId: sessionId,
      };

      // 发送消息到AI服务
      const aiResponse: AIResponse = await aiService.SendMessage(content, context, {
        includeDataAnalysis: !!session.currentDataset,
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
          mermaidType: chart.mermaidType,
          mermaidCode: chart.mermaidCode,
          sourceVisible: false,
        })),
      };

      set((prevState) => ({
        sessions: {
          ...prevState.sessions,
          [sessionId]: {
            ...prevState.sessions[sessionId],
            messages: [...prevState.sessions[sessionId].messages, assistantMessage],
            isLoading: false,
            updatedAt: new Date()
          }
        }
      }));

      // 保存会话
      await get().SaveSession(sessionId);
    } catch (error) {
      console.error('发送消息失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '发送消息失败，请重试';
      
      // 添加错误消息
      state.AddMessage(sessionId, {
        type: 'assistant',
        content: `抱歉，${errorMessage}`,
        error: true,
      });

      set((prevState) => ({
        sessions: {
          ...prevState.sessions,
          [sessionId]: {
            ...prevState.sessions[sessionId],
            isLoading: false,
            error: errorMessage
          }
        }
      }));
    }
  },

  ClearSession: (sessionId: string) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [],
            error: undefined,
            updatedAt: new Date()
          }
        }
      };
    });

    get().SaveSession(sessionId);
  },

  SetSessionDataset: (sessionId: string, datasetId?: string, metadata?: DatasetMetadata) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            currentDataset: datasetId,
            currentDatasetMetadata: metadata,
            updatedAt: new Date()
          }
        }
      };
    });

    // 保存当前活动数据集
    if (datasetId) {
      storageService.SetActiveDataset(datasetId);
    }

    get().SaveSession(sessionId);
  },

  SetSessionError: (sessionId: string, error?: string) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            error
          }
        }
      };
    });
  },

  RetryLastMessage: async (sessionId: string) => {
    const { sessions } = get();
    const session = sessions[sessionId];
    if (!session) return;
    
    // 找到最后一条用户消息
    const lastUserMessage = session.messages
      .slice()
      .reverse()
      .find(msg => msg.type === 'user');

    if (lastUserMessage) {
      // 移除最后一条错误的AI回复
      const filteredMessages = session.messages.filter(msg => 
        !(msg.type === 'assistant' && msg.error && msg.timestamp > lastUserMessage.timestamp)
      );
      
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            messages: filteredMessages
          }
        }
      }));
      
      // 重新发送消息
      await get().SendMessage(sessionId, lastUserMessage.content);
    }
  },

  LoadSessions: async () => {
    try {
      const sessions = await storageService.GetChatSessions();
      if (sessions) {
        set({ sessions });
      }
    } catch (error) {
      console.error('加载聊天会话失败:', error);
    }
  },

  SaveSessions: async () => {
    try {
      const { sessions } = get();
      await storageService.SaveChatSessions(sessions);
    } catch (error) {
      console.error('保存聊天会话失败:', error);
    }
  },

  SaveSession: async (sessionId: string) => {
    try {
      const { sessions } = get();
      const session = sessions[sessionId];
      if (session) {
        await storageService.SaveChatSession(sessionId, session);
      }
    } catch (error) {
      console.error('保存聊天会话失败:', error);
    }
  },

  GetSession: (sessionId: string) => {
    const { sessions } = get();
    return sessions[sessionId];
  },

  GetSessionMessages: (sessionId: string) => {
    const session = get().GetSession(sessionId);
    return session?.messages || [];
  },

  GetSessionLoading: (sessionId: string) => {
    const session = get().GetSession(sessionId);
    return session?.isLoading || false;
  },

  GetSessionError: (sessionId: string) => {
    const session = get().GetSession(sessionId);
    return session?.error;
  },
}));
