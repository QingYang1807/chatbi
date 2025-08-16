// 设置状态管理

import { create } from 'zustand';
import { ModelConfig, UIPreferences, GLMModel } from '../types';
import { storageService } from '../services/storageService';
import { aiService } from '../services/aiService';

interface SettingsState {
  modelConfig: ModelConfig;
  uiPreferences: UIPreferences;
  apiKeyValid: boolean;
  lastApiCheck?: Date;
  isValidating: boolean;

  // Actions
  UpdateModelConfig: (config: Partial<ModelConfig>) => Promise<void>;
  UpdateUIPreferences: (preferences: Partial<UIPreferences>) => void;
  ValidateApiKey: (apiKey?: string) => Promise<boolean>;
  SwitchModel: (model: GLMModel) => Promise<void>;
  LoadSettings: () => Promise<void>;
  SaveSettings: () => Promise<void>;
  ResetSettings: () => void;
  ClearApiKey: () => void;
}

// 默认配置
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  name: 'glm-4.5',
  apiKey: '',
  endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  maxTokens: 4096,
  temperature: 0.7,
};

const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'light',
  language: 'zh',
  autoGenerateCharts: true,
  showDataPreview: true,
  enableNotifications: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  modelConfig: DEFAULT_MODEL_CONFIG,
  uiPreferences: DEFAULT_UI_PREFERENCES,
  apiKeyValid: false,
  lastApiCheck: undefined,
  isValidating: false,

  UpdateModelConfig: async (config: Partial<ModelConfig>) => {
    const currentConfig = get().modelConfig;
    const newConfig = { ...currentConfig, ...config };

    set({ modelConfig: newConfig });

    // 更新AI服务配置
    aiService.SetModelConfig(newConfig);

    // 如果API密钥更新了，验证新密钥
    if (config.apiKey && config.apiKey !== currentConfig.apiKey) {
      await get().ValidateApiKey(config.apiKey);
    }

    // 保存设置
    await get().SaveSettings();
  },

  UpdateUIPreferences: (preferences: Partial<UIPreferences>) => {
    set((state) => ({
      uiPreferences: { ...state.uiPreferences, ...preferences },
    }));

    // 保存设置
    get().SaveSettings();
  },

  ValidateApiKey: async (apiKey?: string) => {
    const keyToValidate = apiKey || get().modelConfig.apiKey;
    
    if (!keyToValidate) {
      set({ apiKeyValid: false });
      return false;
    }

    set({ isValidating: true });

    try {
      const isValid = await aiService.ValidateApiKey(keyToValidate, get().modelConfig.name);
      
      set({
        apiKeyValid: isValid,
        lastApiCheck: new Date(),
        isValidating: false,
      });

      return isValid;
    } catch (error) {
      console.error('API密钥验证失败:', error);
      set({
        apiKeyValid: false,
        lastApiCheck: new Date(),
        isValidating: false,
      });
      return false;
    }
  },

  SwitchModel: async (model: GLMModel) => {
    const currentConfig = get().modelConfig;
    const newConfig = { ...currentConfig, name: model };

    set({ modelConfig: newConfig });
    aiService.SetModelConfig(newConfig);

    // 验证API密钥在新模型下是否有效
    if (currentConfig.apiKey) {
      await get().ValidateApiKey();
    }

    // 保存设置
    await get().SaveSettings();
  },

  LoadSettings: async () => {
    try {
      // 加载模型配置
      const savedModelConfig = storageService.GetModelConfig();
      if (savedModelConfig) {
        const modelConfig = { ...DEFAULT_MODEL_CONFIG, ...savedModelConfig };
        set({ modelConfig });
        aiService.SetModelConfig(modelConfig);

        // 验证保存的API密钥
        if (modelConfig.apiKey) {
          get().ValidateApiKey();
        }
      }

      // 加载UI偏好设置
      const savedUIPreferences = storageService.GetUIPreferences();
      if (savedUIPreferences) {
        set({ uiPreferences: { ...DEFAULT_UI_PREFERENCES, ...savedUIPreferences } });
      }

    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  SaveSettings: async () => {
    try {
      const { modelConfig, uiPreferences } = get();
      
      // 保存模型配置（包括API密钥）
      storageService.SaveModelConfig(modelConfig);
      
      // 保存UI偏好设置
      storageService.SaveUIPreferences(uiPreferences);

    } catch (error) {
      console.error('保存设置失败:', error);
    }
  },

  ResetSettings: () => {
    set({
      modelConfig: DEFAULT_MODEL_CONFIG,
      uiPreferences: DEFAULT_UI_PREFERENCES,
      apiKeyValid: false,
      lastApiCheck: undefined,
    });

    // 更新AI服务配置
    aiService.SetModelConfig(DEFAULT_MODEL_CONFIG);

    // 保存重置后的设置
    get().SaveSettings();
  },

  ClearApiKey: () => {
    const currentConfig = get().modelConfig;
    const newConfig = { ...currentConfig, apiKey: '' };

    set({
      modelConfig: newConfig,
      apiKeyValid: false,
      lastApiCheck: undefined,
    });

    // 清除存储的API密钥
    storageService.ClearApiKey();

    // 更新AI服务配置
    aiService.SetModelConfig(newConfig);

    // 保存设置
    get().SaveSettings();
  },
}));
