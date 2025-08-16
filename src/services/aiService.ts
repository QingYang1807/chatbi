// AI服务层 - 智谱GLM API集成

import { GLMModel, ModelConfig, AIResponse, ChatContext, ChartSuggestion, APIError } from '../types';

interface GLMAPIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface GLMAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class AIService {
  private currentConfig: ModelConfig | null = null;
  private readonly API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  SetModelConfig(config: ModelConfig): void {
    this.currentConfig = config;
  }

  GetCurrentModel(): GLMModel | null {
    return this.currentConfig?.name || null;
  }

  async ValidateApiKey(apiKey: string, model: GLMModel = 'glm-4.5'): Promise<boolean> {
    try {
      const testConfig: ModelConfig = {
        name: model,
        apiKey,
        endpoint: this.API_BASE_URL,
        maxTokens: 100,
        temperature: 0.1,
      };

      const testRequest: GLMAPIRequest = {
        model: model,
        messages: [
          {
            role: 'user',
            content: '请简单回复"测试成功"',
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      };

      const response = await this.MakeAPIRequest(testRequest, testConfig);
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('API密钥验证失败:', error);
      return false;
    }
  }

  async SendMessage(
    message: string,
    context: ChatContext,
    options?: {
      includeDataAnalysis?: boolean;
      suggestCharts?: boolean;
    }
  ): Promise<AIResponse> {
    if (!this.currentConfig) {
      throw new Error('请先配置AI模型');
    }

    try {
      // 构建系统提示词
      const systemPrompt = this.BuildSystemPrompt(context, options);
      
      // 构建消息历史
      const messages = this.BuildMessageHistory(context, systemPrompt, message);

      const request: GLMAPIRequest = {
        model: this.currentConfig.name,
        messages,
        temperature: this.currentConfig.temperature,
        max_tokens: this.currentConfig.maxTokens,
      };

      const response = await this.MakeAPIRequest(request, this.currentConfig);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('AI响应格式错误');
      }

      const content = response.choices[0].message.content;
      
      // 解析可能的图表建议
      const charts = this.ParseChartSuggestions(content);

      return {
        content: content,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        finishReason: response.choices[0].finish_reason as 'stop' | 'length' | 'content_filter',
        charts,
      };
    } catch (error) {
      console.error('发送消息失败:', error);
      throw this.HandleAPIError(error);
    }
  }

  private BuildSystemPrompt(context: ChatContext, options?: any): string {
    let prompt = `你是一个专业的数据分析助手，擅长解读数据并提供有价值的商业洞察。

核心能力：
1. 理解用户的自然语言查询
2. 分析数据集并提供统计洞察
3. 建议合适的数据可视化方案
4. 提供业务决策建议

回答原则：
- 回答要简洁明了，重点突出
- 提供具体的数据支撑
- 当数据适合可视化时，建议具体的图表类型
- 用中文回答`;

    if (context.currentDataset) {
      prompt += `

当前分析的数据集：${context.currentDataset}
请基于这个数据集回答用户的问题。`;
    }

    if (options?.suggestCharts) {
      prompt += `

如果数据适合可视化，请在回答末尾使用以下格式建议图表：
[CHART_SUGGESTION]
type: bar|line|pie|scatter|area
title: 图表标题
description: 图表描述
data: 相关数据字段
[/CHART_SUGGESTION]`;
    }

    return prompt;
  }

  private BuildMessageHistory(
    context: ChatContext,
    systemPrompt: string,
    newMessage: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // 添加最近的对话历史（最多10条）
    const recentMessages = context.messages.slice(-10);
    recentMessages.forEach((msg) => {
      if (msg.type === 'user' || msg.type === 'assistant') {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    });

    // 添加当前消息
    messages.push({ role: 'user', content: newMessage });

    return messages;
  }

  private async MakeAPIRequest(
    request: GLMAPIRequest,
    config: ModelConfig
  ): Promise<GLMAPIResponse> {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API请求失败 (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // 如果无法解析错误响应，使用默认错误消息
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  }

  private ParseChartSuggestions(content: string): ChartSuggestion[] {
    const charts: ChartSuggestion[] = [];
    const chartRegex = /\[CHART_SUGGESTION\](.*?)\[\/CHART_SUGGESTION\]/gs;
    let match;

    while ((match = chartRegex.exec(content)) !== null) {
      try {
        const chartData = match[1];
        const lines = chartData.trim().split('\n');
        const suggestion: Partial<ChartSuggestion> = {};

        lines.forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          switch (key) {
            case 'type':
              suggestion.type = value as any;
              break;
            case 'title':
              suggestion.title = value;
              break;
            case 'description':
              suggestion.description = value;
              break;
            case 'data':
              suggestion.data = []; // 实际数据需要在后续处理中填充
              break;
          }
        });

        if (suggestion.type && suggestion.title) {
          charts.push({
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description || '',
            data: suggestion.data || [],
            config: {},
          });
        }
      } catch (error) {
        console.warn('解析图表建议失败:', error);
      }
    }

    return charts;
  }

  private HandleAPIError(error: any): APIError {
    if (error instanceof Error) {
      // 网络错误
      if (error.message.includes('fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: '网络连接失败，请检查网络设置',
          details: error.message,
        };
      }

      // API密钥错误
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return {
          code: 'AUTH_ERROR',
          message: 'API密钥无效，请检查配置',
          details: error.message,
        };
      }

      // 配额超限
      if (error.message.includes('429') || error.message.includes('quota')) {
        return {
          code: 'QUOTA_ERROR',
          message: 'API调用频率超限，请稍后重试',
          details: error.message,
        };
      }

      // 其他API错误
      return {
        code: 'API_ERROR',
        message: error.message,
        details: error.message,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: '未知错误，请稍后重试',
      details: String(error),
    };
  }

  // 获取支持的模型列表
  GetSupportedModels(): GLMModel[] {
    return ['glm-4.5', 'glm-4.5-air'];
  }

  // 获取模型信息
  GetModelInfo(model: GLMModel): { name: string; description: string; maxTokens: number } {
    const modelInfo = {
      'glm-4.5': {
        name: 'GLM-4.5',
        description: '智谱AI最新模型，具有强大的理解和生成能力',
        maxTokens: 4096,
      },
      'glm-4.5-air': {
        name: 'GLM-4.5-Air',
        description: '轻量版模型，响应速度更快，成本更低',
        maxTokens: 4096,
      },
    };

    return modelInfo[model];
  }
}

export const aiService = new AIService();
