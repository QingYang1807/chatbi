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

    // 使用完整的元数据信息
    if (context.currentDatasetMetadata) {
      const metadata = context.currentDatasetMetadata;
      console.log('🤖 AI服务接收到完整元数据:', {
        datasetName: metadata.basic.name,
        qualityScore: metadata.quality.consistency.score,
        businessDomains: metadata.semantics.businessDomain
      });
      
      // 构建详细的数据集信息
      prompt += `

当前分析的数据集：${metadata.basic.name}
数据集描述：${metadata.basic.description}

=== 基本信息 ===
- 文件名：${metadata.file.fileName}
- 文件大小：${metadata.file.fileSizeFormatted}
- 文件类型：${metadata.file.fileType}
- 上传时间：${new Date(metadata.file.uploadTime).toLocaleString()}

=== 数据结构 ===
- 总行数：${metadata.structure.totalRows}
- 实际数据行数：${metadata.structure.actualDataRows}
- 总列数：${metadata.structure.totalColumns}
- 数值列：${metadata.structure.columnTypes.number}个
- 文本列：${metadata.structure.columnTypes.string}个
- 日期列：${metadata.structure.columnTypes.date}个
- 布尔列：${metadata.structure.columnTypes.boolean}个

=== 数据质量分析 ===
- 质量评分：${metadata.quality.consistency.score}/100
- 数据完整性：${metadata.quality.completeness.completenessRate}%
- 空值数量：${metadata.quality.completeness.emptyCells}
- 重复行：${metadata.quality.uniqueness.duplicateRows}行（${metadata.quality.uniqueness.duplicateRate}%）`;

      // 质量问题
      if (metadata.quality.consistency.issues.length > 0) {
        prompt += `\n- 数据质量问题：`;
        metadata.quality.consistency.issues.forEach((issue: any) => {
          prompt += `\n  * ${issue.description}（严重程度：${issue.severity}）`;
        });
      }

      // 详细列信息
      prompt += `\n\n=== 数据字段详细信息 ===`;
      metadata.columns.forEach((col: any) => {
        prompt += `\n- ${col.name}（${this.GetColumnTypeName(col.type)}）`;
        
        if (col.statistics) {
          prompt += `\n  * 统计：有效值${col.statistics.count}个，空值率${col.statistics.nullRate}%，唯一值率${col.statistics.uniqueRate}%`;
        }

        if (col.numericStats) {
          prompt += `\n  * 数值分析：范围[${col.numericStats.min}, ${col.numericStats.max}]，均值${col.numericStats.mean}，中位数${col.numericStats.median}`;
        }

        if (col.textStats) {
          prompt += `\n  * 文本分析：长度范围[${col.textStats.minLength}, ${col.textStats.maxLength}]，平均${col.textStats.avgLength}字符`;
          if (col.textStats.commonValues.length > 0) {
            const topValues = col.textStats.commonValues.slice(0, 3).map((v: any) => `${v.value}(${v.percentage}%)`).join('、');
            prompt += `，常见值：${topValues}`;
          }
        }

        if (col.dateStats) {
          prompt += `\n  * 日期分析：范围[${col.dateStats.minDate.toLocaleDateString()}, ${col.dateStats.maxDate.toLocaleDateString()}]，跨度${col.dateStats.dateRange}天`;
        }

        if (col.semanticType) {
          prompt += `\n  * 语义类型：${col.semanticType.category}（置信度${Math.round(col.semanticType.confidence * 100)}%）`;
        }

        if (col.examples && col.examples.length > 0) {
          prompt += `\n  * 示例值：${col.examples.slice(0, 3).join('、')}`;
        }
      });

      // Excel特定信息
      if (metadata.excel) {
        prompt += `\n\n=== Excel工作表信息 ===
- 总工作表数：${metadata.excel.totalSheets}
- 数据来源分布：`;
        Object.entries(metadata.excel.dataSourceDistribution).forEach(([sheet, stats]: [string, any]) => {
          prompt += `\n  * ${sheet}：${stats.count}行（${stats.percentage}%）`;
        });

        if (metadata.excel.crossSheetRelations.length > 0) {
          prompt += `\n- 工作表关联：`;
          metadata.excel.crossSheetRelations.forEach((relation: string) => {
            prompt += `\n  * ${relation}`;
          });
        }
      }

      // 业务语义分析
      prompt += `\n\n=== 业务语义分析 ===
- 表类型：${metadata.semantics.tableType}
- 业务领域：${metadata.semantics.businessDomain.join('、')}
- 可能的主键列：${metadata.semantics.possibleKeyColumns.join('、') || '无'}
- 可能的日期列：${metadata.semantics.possibleDateColumns.join('、') || '无'}
- 可能的金额列：${metadata.semantics.possibleCurrencyColumns.join('、') || '无'}
- 可能的分类列：${metadata.semantics.possibleCategoryColumns.join('、') || '无'}`;

      // 可视化建议
      prompt += `\n\n=== 推荐可视化方案 ===
- 建议图表类型：${metadata.visualization.recommendedChartTypes.join('、')}
- 关键分析列：${metadata.visualization.keyColumns.join('、')}`;
      if (metadata.visualization.trends.length > 0) {
        prompt += `\n- 趋势分析：${metadata.visualization.trends.join('、')}`;
      }
      if (metadata.visualization.correlations.length > 0) {
        prompt += `\n- 相关性分析：${metadata.visualization.correlations.join('、')}`;
      }

      // 数据预览
      if (metadata.preview.sampleRows.length > 0) {
        prompt += `\n\n=== 数据样本 ===`;
        metadata.preview.sampleRows.slice(0, 3).forEach((row: any, index: number) => {
          prompt += `\n第${index + 1}行：`;
          Object.entries(row).forEach(([key, value]) => {
            if (key !== '_sheet_source') {
              prompt += ` ${key}=${value}`;
            }
          });
        });
      }

      prompt += `\n\n请基于以上完整的数据集元数据信息回答用户的问题，进行深入的数据分析和商业洞察。`;
    } else if (context.currentDatasetData) {
      // 兼容旧的数据集格式
      const dataset = context.currentDatasetData;
      console.log('🤖 AI服务使用兼容模式，接收到数据集信息:', {
        name: dataset.name,
        rows: dataset.summary.totalRows,
        columns: dataset.summary.totalColumns
      });
      
      prompt += `\n\n当前分析的数据集：${dataset.name}\n请基于现有数据进行分析。`;
    }

    if (options?.suggestCharts) {
      prompt += `

=== 图表生成指导 ===
如果数据适合可视化，请使用Mermaid图表。请在回答末尾使用以下格式建议图表：

[MERMAID_CHART]
type: mermaid
mermaidType: pie|xyChart|flowchart|sequence|gantt|quadrant|timeline|sankey|bar|graph
title: 图表标题
description: 图表描述和解释
mermaidCode: 
\`\`\`mermaid
这里是完整的Mermaid图表代码
\`\`\`
[/MERMAID_CHART]

Mermaid图表类型选择指导：

📊 **数据分析图表：**
- pie: 比例、占比分析（销售额分布、市场份额、用户分布）
- xyChart: 数值趋势、相关性分析（时间序列、趋势对比、散点图）
- bar: 柱状对比图（适用于分类数据对比）

🔄 **流程分析图表：**
- flowchart: 业务流程、决策树、步骤说明、数据流向
- sequence: 时序交互、系统调用、用户行为流程
- journey: 用户体验旅程、客户生命周期

📅 **时间管理图表：**
- gantt: 项目时间线、任务安排、里程碑展示
- timeline: 事件时间轴、发展历程、重要节点

🎯 **战略分析图表：**
- quadrant: 四象限分析（重要性/紧急性、风险/收益矩阵）
- sankey: 流量分析、转化漏斗、资源分配

🌐 **关系结构图表：**
- graph: 关系网络、依赖关系、组织架构
- mindmap: 思维导图、知识结构、概念关联
- er: 数据库设计、实体关系
- class: 系统架构、类关系

Mermaid语法要求：
✅ 完整可渲染的标准语法
✅ 中文标签和节点名称  
✅ 基于实际数据分析结果
✅ 简洁美观的配色方案
✅ 适当的图表大小和布局

常用语法模板：

**饼图 (pie):**
\`\`\`mermaid
pie title 图表标题
    "分类1" : 数值1
    "分类2" : 数值2
    "分类3" : 数值3
\`\`\`

**XY图表 (xyChart):**
\`\`\`mermaid
xyChart-beta
    title "趋势分析"
    x-axis [1月, 2月, 3月, 4月]
    y-axis "数值" 0 --> 100
    line [20, 45, 60, 80]
\`\`\`

**流程图 (flowchart):**
\`\`\`mermaid
flowchart TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作1]
    B -->|否| D[执行操作2]
    C --> E[结束]
    D --> E
\`\`\`

**四象限图 (quadrant):**
\`\`\`mermaid
quadrantChart
    title 重要性矩阵
    x-axis 紧急程度 --> 高
    y-axis 重要程度 --> 高
    quadrant-1 立即执行
    quadrant-2 计划安排
    quadrant-3 授权处理
    quadrant-4 消除浪费
    任务A: [0.8, 0.9]
    任务B: [0.3, 0.7]
\`\`\`

**甘特图 (gantt):**
\`\`\`mermaid
gantt
    title 项目时间安排
    dateFormat  YYYY-MM-DD
    section 阶段1
    任务1    :2024-01-01, 30d
    任务2    :2024-01-15, 20d
    section 阶段2
    任务3    :2024-02-01, 25d
\`\`\`

示例完整格式：
[MERMAID_CHART]
type: mermaid
mermaidType: pie
title: 销售数据分布分析
description: 根据数据集中的销售数据，展示各产品类别的销售额占比情况，帮助识别主要收入来源
mermaidCode: 
\`\`\`mermaid
pie title 产品销售额分布
    "电子产品" : 45.2
    "服装配饰" : 28.7
    "家居用品" : 18.6
    "运动户外" : 7.5
\`\`\`
[/MERMAID_CHART]`;
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
    
    // 解析传统图表建议（保持向后兼容）
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
        console.warn('解析传统图表建议失败:', error);
      }
    }

    // 解析Mermaid图表建议
    const mermaidRegex = /\[MERMAID_CHART\](.*?)\[\/MERMAID_CHART\]/gs;
    let mermaidMatch;

    while ((mermaidMatch = mermaidRegex.exec(content)) !== null) {
      try {
        const chartData = mermaidMatch[1];
        const suggestion: Partial<ChartSuggestion> = {
          type: 'mermaid',
          data: [],
          config: {}
        };

        // 解析基本属性
        const typeMatch = chartData.match(/mermaidType:\s*(\w+)/);
        const titleMatch = chartData.match(/title:\s*(.+?)(?:\n|$)/);
        const descMatch = chartData.match(/description:\s*(.+?)(?:\n|$)/);
        
        // 解析Mermaid代码
        const codeMatch = chartData.match(/mermaidCode:\s*```mermaid\n([\s\S]*?)```/);

        if (typeMatch) {
          suggestion.mermaidType = typeMatch[1] as any;
        }
        
        if (titleMatch) {
          suggestion.title = titleMatch[1].trim();
        }
        
        if (descMatch) {
          suggestion.description = descMatch[1].trim();
        }
        
        if (codeMatch) {
          suggestion.mermaidCode = codeMatch[1].trim();
        }

        // 验证必要字段
        if (suggestion.title && suggestion.mermaidCode && suggestion.mermaidType) {
          charts.push({
            type: 'mermaid',
            title: suggestion.title,
            description: suggestion.description || '',
            data: [],
            config: {},
            mermaidType: suggestion.mermaidType,
            mermaidCode: suggestion.mermaidCode
          });
          
          console.log('✅ 成功解析Mermaid图表:', {
            title: suggestion.title,
            type: suggestion.mermaidType,
            codeLength: suggestion.mermaidCode.length
          });
        } else {
          console.warn('⚠️ Mermaid图表缺少必要字段:', {
            hasTitle: !!suggestion.title,
            hasCode: !!suggestion.mermaidCode,
            hasType: !!suggestion.mermaidType
          });
        }
      } catch (error) {
        console.warn('💥 解析Mermaid图表建议失败:', error);
      }
    }

    console.log(`📊 共解析到 ${charts.length} 个图表建议`);
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

  // 获取数据类型的中文名称
  private GetColumnTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      string: '文本',
      number: '数值',
      date: '日期',
      boolean: '布尔',
    };
    return typeNames[type] || type;
  }
}

export const aiService = new AIService();
