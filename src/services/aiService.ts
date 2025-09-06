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
    let prompt = `# 商业智能分析师助手

## 🎯 角色定位
您是一位资深的商业智能分析专家，拥有丰富的数据洞察经验和深厚的商业理解能力。您能够将复杂的数据转化为清晰的商业价值，为决策者提供可行的业务建议。

## 🚀 核心专长
**数据分析能力**
- 深度解析数据集，识别关键趋势、模式和异常值
- 运用描述性、诊断性、预测性和规范性分析方法
- 熟练掌握统计学原理和数据挖掘技术

**可视化专家**
- 根据数据特点推荐最适合的可视化方案
- 精通各类图表的使用场景和最佳实践
- 能够设计直观、美观且有说服力的数据展示

**业务洞察力**
- 从商业角度解读数据背后的故事
- 关注数据对业务决策的实际影响
- 提供基于数据驱动的可执行建议

**沟通艺术**
- 使用清晰、专业且易懂的语言
- 避免过度技术化的表达
- 结构化呈现分析结果，突出关键发现

## 📊 专业知识储备
**工具熟悉度**：精通Tableau、Power BI、Looker等主流BI工具
**分析框架**：掌握CRISP-DM、KDD等数据分析方法论
**行业洞察**：了解各行业关键KPI和业务流程
**数据建模**：理解数据仓库设计、星型模型和雪花模型

## 💬 沟通风格指南
**语调特点**：
- 专业自信但不傲慢，体现深厚的专业功底
- 友好耐心，乐于分享知识和见解
- 简洁明了，直击要点，避免冗余表达

**表达原则**：
- 始终从业务价值出发，关注实际应用
- 用数据说话，提供具体的证据支撑
- 结构化呈现，使用标题、要点、表格等提高可读性
- 关键结论用**粗体**突出显示

## 📝 标准回答模板

### 📈 数据分析回答结构
**模板格式说明：**
1. **核心发现** - 用1-2句话总结最重要的洞察
2. **详细分析** - 包含数据概览、关键指标、业务洞察
3. **建议与行动** - 分为立即行动和中长期规划
4. **可视化建议** - 推荐具体的图表类型和展示方式

**回答结构要求：**
- 使用清晰的标题层级（## ### ####）
- 重要结论用**粗体**标注
- 数据用具体数值支撑
- 提供可执行的建议

## 🎨 专业术语使用
- 使用行业标准术语，但要适当解释
- 避免过度技术化的表达
- 优先使用业务语言而非技术术语
- 确保表达清晰易懂，适合不同背景的读者

现在，请基于这个专业框架来分析和回答问题，展现您作为资深商业智能分析师的专业水准。`;

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

## 📋 当前分析数据集
**数据集名称**：${metadata.basic.name}
**业务描述**：${metadata.basic.description}

### 📁 数据源信息
- **文件名称**：${metadata.file.fileName}
- **数据规模**：${metadata.file.fileSizeFormatted}
- **格式类型**：${metadata.file.fileType}
- **导入时间**：${new Date(metadata.file.uploadTime).toLocaleString()}

### 🏗️ 数据结构概览
- **总体规模**：${metadata.structure.totalRows.toLocaleString()}行 × ${metadata.structure.totalColumns}列（含${metadata.structure.actualDataRows.toLocaleString()}行有效数据）
- **字段类型分布**：
  - 📊 数值型字段：${metadata.structure.columnTypes.number}个（适合定量分析）
  - 📝 文本型字段：${metadata.structure.columnTypes.string}个（适合分类分析）
  - 📅 日期型字段：${metadata.structure.columnTypes.date}个（适合时间序列分析）
  - ✅ 布尔型字段：${metadata.structure.columnTypes.boolean}个（适合对比分析）

### 🎯 数据质量评估
- **综合质量评分**：${metadata.quality.consistency.score}/100 ${metadata.quality.consistency.score >= 80 ? '(优秀)' : metadata.quality.consistency.score >= 60 ? '(良好)' : '(需改进)'}
- **数据完整性**：${metadata.quality.completeness.completenessRate}%（${metadata.quality.completeness.completenessRate >= 95 ? '数据完整度很高' : metadata.quality.completeness.completenessRate >= 80 ? '数据完整度良好' : '存在较多缺失值'}）
- **缺失值情况**：${metadata.quality.completeness.emptyCells.toLocaleString()}个空值
- **数据唯一性**：${metadata.quality.uniqueness.duplicateRows.toLocaleString()}行重复数据（占比${metadata.quality.uniqueness.duplicateRate}%）`;

      // 质量问题
      if (metadata.quality.consistency.issues.length > 0) {
        prompt += `\n\n### ⚠️ 数据质量关注点`;
        metadata.quality.consistency.issues.forEach((issue: any) => {
          const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
          prompt += `\n- ${severityIcon} **${issue.description}**（${issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}优先级）`;
        });
      }

      // 详细列信息
      prompt += `\n\n### 📊 关键字段分析`;
      metadata.columns.forEach((col: any) => {
        prompt += `\n\n**${col.name}** (${this.GetColumnTypeName(col.type)}字段)`;
        
        if (col.statistics) {
          const completeness = 100 - col.statistics.nullRate;
          const uniqueness = col.statistics.uniqueRate;
          prompt += `\n- **数据质量**：完整度${completeness.toFixed(1)}%，唯一性${uniqueness.toFixed(1)}%（共${col.statistics.count.toLocaleString()}个有效值）`;
        }

        if (col.numericStats) {
          prompt += `\n- **数值特征**：取值范围 ${col.numericStats.min.toLocaleString()} ~ ${col.numericStats.max.toLocaleString()}，均值 ${col.numericStats.mean.toFixed(2)}，中位数 ${col.numericStats.median.toFixed(2)}`;
        }

        if (col.textStats) {
          prompt += `\n- **文本特征**：长度${col.textStats.minLength}-${col.textStats.maxLength}字符（平均${col.textStats.avgLength.toFixed(1)}字符）`;
          if (col.textStats.commonValues.length > 0) {
            const topValues = col.textStats.commonValues.slice(0, 3).map((v: any) => `${v.value}(${v.percentage}%)`).join('、');
            prompt += `\n- **主要分布**：${topValues}`;
          }
        }

        if (col.dateStats) {
          const days = col.dateStats.dateRange;
          const timespan = days > 365 ? `${(days/365).toFixed(1)}年` : days > 30 ? `${Math.round(days/30)}个月` : `${days}天`;
          prompt += `\n- **时间范围**：${col.dateStats.minDate.toLocaleDateString()} 至 ${col.dateStats.maxDate.toLocaleDateString()}（跨度${timespan}）`;
        }

        if (col.semanticType) {
          const confidence = Math.round(col.semanticType.confidence * 100);
          prompt += `\n- **业务含义**：${col.semanticType.category}（识别置信度${confidence}%）`;
        }

        if (col.examples && col.examples.length > 0) {
          prompt += `\n- **示例数据**：${col.examples.slice(0, 3).join('、')}`;
        }
      });

      // Excel特定信息
      if (metadata.excel) {
        prompt += `\n\n### 📋 Excel工作表结构`;
        prompt += `\n- **工作表总数**：${metadata.excel.totalSheets}个`;
        prompt += `\n- **数据分布情况**：`;
        Object.entries(metadata.excel.dataSourceDistribution).forEach(([sheet, stats]: [string, any]) => {
          prompt += `\n  - ${sheet}：${stats.count.toLocaleString()}行数据（占比${stats.percentage}%）`;
        });

        if (metadata.excel.crossSheetRelations.length > 0) {
          prompt += `\n- **工作表关联性**：`;
          metadata.excel.crossSheetRelations.forEach((relation: string) => {
            prompt += `\n  - ${relation}`;
          });
        }
      }

      // 业务语义分析
      const domainIcons = {
        '销售': '💰', '财务': '📊', '人力资源': '👥', '市场营销': '📈', 
        '运营': '⚙️', '客户服务': '🤝', '产品': '📱', '供应链': '🚚'
      };
      
      prompt += `\n\n### 🎯 业务语义识别`;
      prompt += `\n- **数据表类型**：${metadata.semantics.tableType}`;
      
      const businessDomains = metadata.semantics.businessDomain.map((domain: string) => {
        const icon = domainIcons[domain as keyof typeof domainIcons] || '📋';
        return `${icon} ${domain}`;
      }).join('、');
      prompt += `\n- **业务领域**：${businessDomains}`;
      
      const keyFields = [
        { label: '主键字段', fields: metadata.semantics.possibleKeyColumns, icon: '🔑' },
        { label: '时间字段', fields: metadata.semantics.possibleDateColumns, icon: '📅' },
        { label: '金额字段', fields: metadata.semantics.possibleCurrencyColumns, icon: '💵' },
        { label: '分类字段', fields: metadata.semantics.possibleCategoryColumns, icon: '🏷️' }
      ];
      
      keyFields.forEach(({ label, fields, icon }) => {
        if (fields.length > 0) {
          prompt += `\n- **${icon} ${label}**：${fields.join('、')}`;
        }
      });

      // 可视化建议
      prompt += `\n\n### 📈 智能可视化建议`;
      prompt += `\n- **推荐图表类型**：${metadata.visualization.recommendedChartTypes.join('、')}`;
      prompt += `\n- **核心分析维度**：${metadata.visualization.keyColumns.join('、')}`;
      
      if (metadata.visualization.trends.length > 0) {
        prompt += `\n- **🔄 趋势分析机会**：${metadata.visualization.trends.join('、')}`;
      }
      if (metadata.visualization.correlations.length > 0) {
        prompt += `\n- **🔗 相关性分析机会**：${metadata.visualization.correlations.join('、')}`;
      }

      // 数据预览
      if (metadata.preview.sampleRows.length > 0) {
        prompt += `\n\n### 👀 数据样本预览`;
        metadata.preview.sampleRows.slice(0, 3).forEach((row: any, index: number) => {
          prompt += `\n\n**样本${index + 1}**：`;
          const sampleData = Object.entries(row)
            .filter(([key]) => key !== '_sheet_source')
            .slice(0, 5) // 只显示前5个字段避免过长
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');
          prompt += `\n${sampleData}`;
        });
      }

      // 添加完整的数据内容
      if (context.currentDatasetData) {
        const dataRows = context.currentDatasetData.rows || [];
        const columns = context.currentDatasetData.columns || [];
        
        // 智能数据采样策略
        const { selectedRows, samplingStrategy } = this.SmartDataSampling(dataRows, 3000); // 增加到3000行
        
        console.log(`📋 AI服务发送优化后的数据内容: ${selectedRows.length}/${dataRows.length} 行数据，采样策略: ${samplingStrategy}`);
        
        prompt += `\n\n### 📊 完整数据内容（可直接分析计算）`;
        prompt += `\n**数据规模**: 正在发送 ${selectedRows.length} 行数据（总共 ${dataRows.length} 行）`;
        prompt += `\n**采样策略**: ${samplingStrategy}`;
        prompt += `\n**数据格式**: 以下是经过智能采样的数据内容，保证了数据的代表性和多样性`;
        
        // 添加数据统计摘要
        prompt += this.GenerateDataStatsSummary(dataRows, columns);
        
        if (selectedRows.length > 0) {
          // 生成Markdown表格格式（更易于AI理解和分析）
          prompt += `\n\n**数据内容（Markdown表格格式）**:`;
          
          // 表头
          const headers = columns.map((col: any) => col.name).filter((name: string) => name !== '_sheet_source');
          
          // 生成Markdown表格
          prompt += `\n\n| ${headers.join(' | ')} |`;
          prompt += `\n|${headers.map(() => ' --- ').join('|')}|`;
          
          // 数据行
          for (let i = 0; i < Math.min(selectedRows.length, 500); i++) { // 限制表格行数
            const row = selectedRows[i];
            const rowValues = headers.map((header: string) => {
              const value = row[header];
              if (value === null || value === undefined) return 'NULL';
              if (typeof value === 'string') return value.replace(/\|/g, '\\|'); // 转义管道符
              return String(value);
            });
            prompt += `\n| ${rowValues.join(' | ')} |`;
          }
          
          if (selectedRows.length > 500) {
            prompt += `\n\n**注意**: 表格只显示前500行数据以保持可读性。完整采样数据包含 ${selectedRows.length} 行。`;
          }
          
          // 同时提供JSON格式以备程序化分析
          prompt += `\n\n**JSON格式数据**（用于精确计算）:`;
          prompt += `\n\`\`\`json`;
          prompt += `\n{`;
          prompt += `\n  "headers": ${JSON.stringify(headers)},`;
          prompt += `\n  "totalRows": ${dataRows.length},`;
          prompt += `\n  "sampleRows": ${selectedRows.length},`;
          prompt += `\n  "data": [`;
          
          // 数据行（JSON格式）
          const jsonSampleSize = Math.min(selectedRows.length, 1000); // JSON格式最多1000行
          for (let i = 0; i < jsonSampleSize; i++) {
            const row = selectedRows[i];
            const rowValues = headers.map((header: string) => row[header]);
            prompt += `\n    ${JSON.stringify(rowValues)}${i < jsonSampleSize - 1 ? ',' : ''}`;
          }
          
          prompt += `\n  ]`;
          prompt += `\n}`;
          prompt += `\n\`\`\``;
          
          if (dataRows.length > selectedRows.length) {
            prompt += `\n\n**数据说明**: 为了优化分析效果，采用了智能采样策略，确保包含了数据的关键特征和模式。完整数据集包含 ${dataRows.length} 行，如需分析特定数据段或全量数据，请明确指出需求。`;
          }
          
          // 添加Excel工作表信息
          if (context.currentDatasetData.sheets && context.currentDatasetData.sheets.length > 1) {
            prompt += `\n\n**多工作表数据来源**：`;
            const sheetStats = this.GetSheetDataDistribution(selectedRows);
            Object.entries(sheetStats).forEach(([sheetName, stats]) => {
              prompt += `\n- ${sheetName}: ${stats.count} 行数据 (${stats.percentage}%)`;
            });
          }
        }
      }

      prompt += `\n\n---

## 🎯 分析任务
基于以上完整的数据集元数据信息和实际数据内容，请以**资深商业智能分析师**的身份，运用专业的分析框架和丰富的业务洞察经验，为用户提供深入的数据分析和有价值的商业见解。

**分析要求**：
- 🔍 **深度挖掘**：不仅分析数据表面现象，更要挖掘背后的业务逻辑，基于真实数据进行计算和分析
- 📊 **量化支撑**：所有结论都要有具体的数据证据支持，可以引用实际的数据值进行论证，直接计算统计指标
- 💡 **可执行建议**：提供切实可行的业务改进建议，基于数据洞察提出具体行动方案
- 🎨 **可视化导向**：主动推荐最适合的图表展示方案，并提供具体的数据可视化建议
- 🔬 **数据驱动**：利用完整的数据内容进行统计分析、趋势识别、异常检测等深度分析
- 📈 **智能图表生成**：基于真实数据内容自动生成Mermaid图表，数据需从实际数据中计算得出，不使用虚拟数据

**重要提示**：您现在拥有完整的数据集内容，包括Markdown表格格式和JSON格式的数据。请直接基于这些真实数据进行分析计算，生成准确的统计结果和图表。所有的数值、百分比、排名等都应该从实际数据中计算得出。`;
    } else if (context.currentDatasetData) {
      // 兼容旧的数据集格式
      const dataset = context.currentDatasetData;
      console.log('🤖 AI服务使用兼容模式，接收到数据集信息:', {
        name: dataset.name,
        rows: dataset.summary?.totalRows || 0,
        columns: dataset.summary?.totalColumns || 0
      });
      
      prompt += `\n\n## 📋 当前分析数据集（兼容模式）
**数据集名称**：${dataset.name}
**基本信息**：${dataset.summary?.totalRows || '未知'}行 × ${dataset.summary?.totalColumns || '未知'}列

⚠️ **注意**：当前使用兼容模式，数据集元数据信息有限。建议用户重新上传数据以获得更详细的分析结果。

---

## 🎯 分析任务
基于当前可用的数据集信息，请以**资深商业智能分析师**的身份，提供专业的数据分析和商业洞察建议。`;
    }

    if (options?.suggestCharts) {
      prompt += `

## 📊 智能可视化生成指南

### 🎯 图表推荐策略
作为专业的BI分析师，您需要根据数据特征和分析目的，智能推荐最合适的可视化方案。请在分析回答中自然地建议图表，并在回答末尾提供具体的图表代码。

### 📈 图表生成格式
当您认为数据适合可视化时，请使用以下标准格式：

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

### 🎨 专业图表类型选择

#### 📊 **数据洞察类图表**
- **饼图 (pie)**：占比分析、市场份额、成本结构、客户分布
  - 适用场景：部分与整体的关系、百分比展示
  - 最佳实践：控制在7个以内的分类，突出重要部分

- **XY图表 (xyChart)**：趋势分析、相关性探索、时间序列
  - 适用场景：连续数据变化、多维度对比、回归分析
  - 最佳实践：清晰的轴标签、合理的数据点密度

- **柱状图 (bar)**：分类对比、排名展示、同比环比
  - 适用场景：离散数据对比、TOP N 分析
  - 最佳实践：统一配色、有序排列

#### 🔄 **业务流程类图表**
- **流程图 (flowchart)**：决策树、业务流程、数据流向
  - 适用场景：业务逻辑梳理、决策路径分析
  - 最佳实践：逻辑清晰、层次分明

- **时序图 (sequence)**：交互流程、系统调用、用户行为
  - 适用场景：时间顺序的交互过程
  - 最佳实践：简化复杂度、突出关键步骤

#### 📅 **时间管理类图表**
- **甘特图 (gantt)**：项目规划、任务安排、里程碑跟踪
  - 适用场景：时间计划、进度管理
  - 最佳实践：清晰的时间轴、合理的任务分组

- **时间轴 (timeline)**：发展历程、重要事件、演进过程
  - 适用场景：历史回顾、发展轨迹
  - 最佳实践：突出关键节点、时间间隔合理

#### 🎯 **战略分析类图表**
- **四象限图 (quadrant)**：优先级矩阵、风险评估、产品定位
  - 适用场景：二维决策分析、资源配置
  - 最佳实践：象限含义明确、数据点分布合理

- **桑基图 (sankey)**：流量分析、转化漏斗、资源流向
  - 适用场景：流程效率、转化率分析
  - 最佳实践：流向清晰、数值准确

### ⚡ 专业制图标准
✅ **数据准确性**：基于真实数据分析结果，数值经过验证
✅ **视觉美观**：合理配色、清晰标签、适当的图表比例
✅ **业务导向**：图表服务于业务洞察，而非技术展示
✅ **交互友好**：标题描述清晰，便于理解和解释
✅ **标准语法**：严格遵循Mermaid语法规范，确保正确渲染

### 💡 图表建议原则
1. **目的明确**：每个图表都要有明确的分析目的
2. **数据匹配**：图表类型要与数据特征相匹配
3. **洞察导向**：图表要能清晰传达业务洞察
4. **简洁有力**：避免复杂图表，突出关键信息
5. **可执行性**：图表要能支撑具体的业务决策

### 🎨 专业制图模板

#### 精选语法模板（基于真实数据分析）

**📊 饼图 - 占比分析（基于数据计算）**
\`\`\`mermaid
pie title 类别分布分析
    "类别A" : 45.2
    "类别B" : 28.7
    "类别C" : 18.6
    "其他" : 7.5
\`\`\`

**📈 XY趋势图 - 时间序列分析**
\`\`\`mermaid
%%{init: {"xyChart": {"width": 900, "height": 600}}}%%
xyChart-beta
    title "数据趋势分析"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "数值" 0 --> 1000
    line [100, 200, 150, 300, 250, 400]
\`\`\`

**📊 柱状图 - 分类对比分析**
\`\`\`mermaid
%%{init: {"xyChart": {"width": 900, "height": 600}}}%%
xyChart-beta
    title "分类数据对比"
    x-axis [A类, B类, C类, D类, E类]
    y-axis "数量" 0 --> 100
    bar [65, 59, 80, 81, 56]
\`\`\`

**🔄 业务流程分析**
\`\`\`mermaid
flowchart TD
    A[数据源] --> B{数据质量检查}
    B -->|通过| C[数据处理]
    B -->|不通过| D[数据清洗]
    C --> E[分析建模]
    D --> C
    E --> F[结果输出]
    F --> G[业务决策]
\`\`\`

**🎯 四象限分析矩阵**
\`\`\`mermaid
quadrantChart
    title 数据分析矩阵
    x-axis 重要性 --> 高
    y-axis 紧急性 --> 高
    quadrant-1 立即执行
    quadrant-2 计划执行
    quadrant-3 委托执行
    quadrant-4 考虑删除
    数据点1: [0.8, 0.9]
    数据点2: [0.3, 0.7]
    数据点3: [0.7, 0.3]
    数据点4: [0.2, 0.2]
\`\`\`

**📅 时间轴 - 发展历程**
\`\`\`mermaid
timeline
    title 数据发展时间轴
    2020 : 数据收集开始
         : 建立基础架构
    2021 : 数据量显著增长
         : 实施数据治理
    2022 : 引入AI分析
         : 业务价值提升
    2023 : 全面数字化转型
         : 预测分析能力
\`\`\`

**🌊 桑基图 - 流程转化分析**
\`\`\`mermaid
sankey-beta
    来源A,目标1,20
    来源A,目标2,30
    来源B,目标1,15
    来源B,目标3,25
    来源C,目标2,10
    来源C,目标3,35
\`\`\`

**📈 多系列对比图**
\`\`\`mermaid
%%{init: {"xyChart": {"width": 900, "height": 600}}}%%
xyChart-beta
    title "多维度数据对比"
    x-axis [Q1, Q2, Q3, Q4]
    y-axis "数值" 0 --> 500
    line [120, 280, 350, 420]
    bar [100, 250, 300, 380]
\`\`\`

### 📋 标准输出示例

[MERMAID_CHART]
type: mermaid
mermaidType: pie
title: 客户价值分布分析
description: 基于RFM模型分析结果，展示不同价值客户群体的占比分布，为精准营销策略提供数据支撑
mermaidCode: 
\`\`\`mermaid
pie title 客户价值层级分布
    "VIP客户" : 12.8
    "重要客户" : 25.6
    "普通客户" : 45.2
    "潜在客户" : 16.4
\`\`\`
[/MERMAID_CHART]

### 🚀 生成原则总结
- 🎯 **业务价值优先**：每个图表都要服务于具体的业务决策
- 📊 **数据支撑强**：图表内容来源于真实的数据分析结果
- 🎨 **视觉效果佳**：清晰美观，便于理解和展示
- 💡 **洞察导向明**：图表要能清晰传达关键的商业洞察
- ⚡ **执行效率高**：支持快速决策，提供可行的行动建议`;
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
        maxTokens: 98304, // 96k tokens
      },
      'glm-4.5-air': {
        name: 'GLM-4.5-Air',
        description: '轻量版模型，响应速度更快，成本更低',
        maxTokens: 98304, // 96k tokens
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

  // 智能数据采样策略
  private SmartDataSampling(dataRows: any[], maxRows: number): { selectedRows: any[], samplingStrategy: string } {
    const totalRows = dataRows.length;
    
    if (totalRows <= maxRows) {
      return {
        selectedRows: dataRows,
        samplingStrategy: '全量数据（数据量适中，无需采样）'
      };
    }

    const selectedRows: any[] = [];
    let samplingStrategy = '';

    // 策略1：始终包含前几行和后几行（边界数据）
    const boundarySize = Math.min(100, Math.floor(maxRows * 0.2));
    selectedRows.push(...dataRows.slice(0, boundarySize));
    selectedRows.push(...dataRows.slice(-boundarySize));
    
    const remainingSlots = maxRows - selectedRows.length;
    
    if (remainingSlots > 0) {
      // 策略2：系统性采样（等间隔采样）
      const stepSize = Math.floor(totalRows / remainingSlots);
      const startOffset = Math.floor(stepSize / 2);
      
      for (let i = 0; i < remainingSlots; i++) {
        const index = startOffset + i * stepSize;
        if (index < totalRows && index >= boundarySize && index < totalRows - boundarySize) {
          selectedRows.push(dataRows[index]);
        }
      }
      
      samplingStrategy = `混合采样：包含前${boundarySize}行、后${boundarySize}行边界数据，以及等间隔采样的中间数据`;
    } else {
      samplingStrategy = `边界采样：包含前${boundarySize}行和后${boundarySize}行数据`;
    }

    // 去重（可能边界数据和采样数据有重叠）
    const uniqueRows = selectedRows.filter((row, index, arr) => 
      arr.findIndex(r => JSON.stringify(r) === JSON.stringify(row)) === index
    );

    return {
      selectedRows: uniqueRows.slice(0, maxRows),
      samplingStrategy
    };
  }

  // 生成数据统计摘要
  private GenerateDataStatsSummary(dataRows: any[], columns: any[]): string {
    if (!dataRows.length || !columns.length) return '';
    
    let summary = `\n\n**数据统计摘要**:`;
    
    // 总体统计
    summary += `\n- **总行数**: ${dataRows.length.toLocaleString()}`;
    summary += `\n- **总列数**: ${columns.length}`;
    
    // 按列类型统计
    const numericCols = columns.filter(col => col.type === 'number');
    const stringCols = columns.filter(col => col.type === 'string');
    const dateCols = columns.filter(col => col.type === 'date');
    const booleanCols = columns.filter(col => col.type === 'boolean');
    
    summary += `\n- **数值列**: ${numericCols.length}个 (${numericCols.map(c => c.name).join(', ')})`;
    summary += `\n- **文本列**: ${stringCols.length}个 (${stringCols.map(c => c.name).join(', ')})`;
    if (dateCols.length > 0) summary += `\n- **日期列**: ${dateCols.length}个 (${dateCols.map(c => c.name).join(', ')})`;
    if (booleanCols.length > 0) summary += `\n- **布尔列**: ${booleanCols.length}个 (${booleanCols.map(c => c.name).join(', ')})`;
    
    // 快速数值统计
    if (numericCols.length > 0) {
      summary += `\n- **数值列快速统计**:`;
      numericCols.slice(0, 3).forEach(col => {
        const values = dataRows
          .map(row => row[col.name])
          .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
          .map(val => Number(val));
        
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          summary += `\n  - ${col.name}: 范围 ${min.toFixed(2)} ~ ${max.toFixed(2)}, 均值 ${avg.toFixed(2)}`;
        }
      });
    }
    
    // 文本列唯一值统计
    if (stringCols.length > 0) {
      summary += `\n- **分类列唯一值统计**:`;
      stringCols.slice(0, 3).forEach(col => {
        const uniqueValues = new Set(dataRows.map(row => row[col.name]).filter(val => val != null));
        summary += `\n  - ${col.name}: ${uniqueValues.size}个不同值`;
      });
    }
    
    return summary;
  }

  // 获取工作表数据分布统计
  private GetSheetDataDistribution(rows: any[]): Record<string, { count: number; percentage: number }> {
    const stats: Record<string, { count: number; percentage: number }> = {};
    const totalRows = rows.length;
    
    if (totalRows === 0) {
      return stats;
    }
    
    // 统计每个sheet的数据行数
    rows.forEach(row => {
      const sheetSource = row['_sheet_source'];
      if (sheetSource) {
        if (!stats[sheetSource]) {
          stats[sheetSource] = { count: 0, percentage: 0 };
        }
        stats[sheetSource].count++;
      }
    });
    
    // 计算百分比
    Object.keys(stats).forEach(sheetName => {
      stats[sheetName].percentage = Math.round((stats[sheetName].count / totalRows) * 100);
    });
    
    return stats;
  }
}

export const aiService = new AIService();
