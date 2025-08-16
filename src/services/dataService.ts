// 数据处理服务

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { 
  DataSet, 
  ColumnInfo, 
  DataSummary, 
  QueryResult, 
  DataUploadResult, 
  SheetInfo,
  DatasetMetadata,
  EnhancedColumnInfo,
  DataQualityIssue,
  ColumnStatistics,
  CategoryStatistics,
  DateStatistics,
  SheetMetadata
} from '../types';

class DataService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly SUPPORTED_FORMATS = ['.csv', '.xlsx', '.xls'];

  async UploadFile(file: File): Promise<DataUploadResult> {
    try {
      console.log('🔍 开始文件上传处理:', file.name, '类型:', file.type, '大小:', file.size);
      
      // 验证文件
      const validation = this.ValidateFile(file);
      console.log('📋 文件验证结果:', validation);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      console.log('📖 开始解析文件...');
      // 解析文件
      const parseResult = await this.ParseFile(file);
      console.log('📊 文件解析完成，原始数据行数:', parseResult.data.length);
      if (parseResult.sheets) {
        console.log('📋 Excel工作表数量:', parseResult.sheets.length);
      }
      
      // 处理数据
      console.log('⚙️ 开始处理数据...');
      const dataset = await this.ProcessData(parseResult.data, file.name, parseResult.sheets);
      console.log('✅ 数据处理完成，最终数据集:', {
        id: dataset.id,
        name: dataset.name,
        rows: dataset.summary.totalRows,
        columns: dataset.summary.totalColumns,
        sheets: dataset.sheets?.length || 0
      });

      return {
        success: true,
        dataset,
        sheets: parseResult.sheets,
      };
    } catch (error) {
      console.error('💥 文件上传失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文件上传失败',
      };
    }
  }

  private ValidateFile(file: File): { isValid: boolean; error?: string } {
    console.log('🔎 验证文件:', file.name);
    console.log('📄 文件类型:', file.type);
    console.log('📏 文件大小:', file.size, 'bytes');
    
    // 检查文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / 1024 / 1024;
      const fileSizeMB = file.size / 1024 / 1024;
      console.log('❌ 文件大小超限:', fileSizeMB.toFixed(2), 'MB >', maxSizeMB, 'MB');
      return {
        isValid: false,
        error: `文件大小超过限制 (${maxSizeMB}MB)`,
      };
    }

    // 检查文件格式
    const extension = this.GetFileExtension(file.name);
    console.log('📁 文件扩展名:', extension);
    console.log('✅ 支持的格式:', this.SUPPORTED_FORMATS);
    
    if (!this.SUPPORTED_FORMATS.includes(extension)) {
      console.log('❌ 不支持的文件格式');
      return {
        isValid: false,
        error: `不支持的文件格式，请上传 ${this.SUPPORTED_FORMATS.join(', ')} 格式的文件`,
      };
    }

    console.log('✅ 文件验证通过');
    return { isValid: true };
  }

  private GetFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private async ParseFile(file: File): Promise<{ data: any[], sheets?: SheetInfo[] }> {
    const extension = this.GetFileExtension(file.name);

    if (extension === '.csv') {
      const data = await this.ParseCSV(file);
      return { data };
    } else if (extension === '.xlsx' || extension === '.xls') {
      const result = await this.ParseExcel(file);
      return { data: result.defaultData, sheets: result.sheets };
    }

    throw new Error('不支持的文件格式');
  }

  private async ParseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV解析警告:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`CSV解析失败: ${error.message}`));
        },
      });
    });
  }

  private async ParseExcel(file: File): Promise<{ sheets: SheetInfo[], defaultData: any[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('🔧 开始解析Excel文件:', file.name, '大小:', file.size);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          console.log('📖 文件读取完成，数据大小:', data.length);
          
          const workbook = XLSX.read(data, { type: 'array' });
          console.log('📊 工作簿解析完成');
          console.log('📋 工作表数量:', workbook.SheetNames.length);
          console.log('📝 工作表名称:', workbook.SheetNames);
          
          if (workbook.SheetNames.length === 0) {
            console.error('❌ Excel文件没有工作表');
            reject(new Error('Excel文件没有工作表'));
            return;
          }
          
          const sheets: SheetInfo[] = [];
          const allCombinedData: any[] = []; // 存储所有sheet合并后的数据
          const allColumnNames = new Set<string>(); // 收集所有列名
          const allSheetsRawData: Array<{ name: string, headers: string[], rows: any[][] }> = []; // 暂存原始数据
          
          // 第一步：收集所有工作表的表头信息
          console.log('📋 第一步：收集所有工作表的列名...');
          for (let i = 0; i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            const worksheet = workbook.Sheets[sheetName];
            console.log(`🔍 扫描工作表 ${i + 1}/${workbook.SheetNames.length}:`, sheetName);
            
            try {
              // 转换为JSON
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
              }) as any[][];

              if (jsonData.length === 0) {
                console.warn(`⚠️ 工作表 "${sheetName}" 为空，跳过`);
                continue;
              }
              
              // 使用第一行作为表头
              const headers = jsonData[0] as string[];
              const rows = jsonData.slice(1);
              
              // 过滤出有效的表头
              const validHeaders = headers
                .map(h => h && String(h).trim())
                .filter(h => h && h !== '');
              
              if (validHeaders.length === 0) {
                console.warn(`⚠️ 工作表 "${sheetName}" 没有有效表头，跳过`);
                continue;
              }
              
              // 收集所有列名
              validHeaders.forEach(header => {
                allColumnNames.add(header);
              });
              
              // 暂存原始数据
              allSheetsRawData.push({
                name: sheetName,
                headers: validHeaders,
                rows: rows
              });
              
            } catch (sheetError) {
              console.error(`💥 扫描工作表 "${sheetName}" 时出错:`, sheetError);
              continue;
            }
          }
          
          if (allSheetsRawData.length === 0) {
            console.error('❌ Excel文件中没有有效的工作表数据');
            reject(new Error('Excel文件中没有有效的工作表数据'));
            return;
          }
          
          console.log('📝 收集到的所有列名:', Array.from(allColumnNames));
          
          // 第二步：处理每个工作表的数据，统一列结构
          console.log('⚙️ 第二步：处理工作表数据...');
          for (const sheetData of allSheetsRawData) {
            const { name: sheetName, headers, rows } = sheetData;
            console.log(`🎯 处理工作表数据:`, sheetName);
            
            try {
              // 过滤空行并转换数据
              const processedRows = rows
                .filter(row => {
                  return row && row.some(cell => 
                    cell !== null && 
                    cell !== undefined && 
                    String(cell).trim() !== ''
                  );
                })
                .map((row) => {
                  const obj: any = {};
                  
                  // 为所有列设置默认值
                  Array.from(allColumnNames).forEach(columnName => {
                    obj[columnName] = '';
                  });
                  
                  // 设置当前sheet的数据
                  headers.forEach((header, index) => {
                    if (header && allColumnNames.has(header)) {
                      const cellValue = row[index];
                      obj[header] = cellValue !== null && cellValue !== undefined 
                        ? String(cellValue).trim() 
                        : '';
                    }
                  });
                  
                  // 添加sheet来源标识
                  obj['_sheet_source'] = sheetName;
                  
                  return obj;
                });

              console.log(`✅ 工作表 "${sheetName}" 处理后的数据条数:`, processedRows.length);
              
              if (processedRows.length === 0) {
                console.warn(`⚠️ 工作表 "${sheetName}" 没有有效数据行，跳过`);
                continue;
              }
              
              // 将当前sheet的数据添加到合并数据中
              allCombinedData.push(...processedRows);
              
              // 分析列信息（基于该sheet的数据）
              const columns = this.AnalyzeColumns(processedRows);
              
              // 生成统计信息
              const summary = this.GenerateDataSummary(processedRows, columns);
              
              // 清理数据
              const cleanedRows = this.CleanData(processedRows, columns);
              
              const sheetInfo: SheetInfo = {
                name: sheetName,
                columns,
                rows: cleanedRows,
                summary
              };
              
              sheets.push(sheetInfo);
              
            } catch (sheetError) {
              console.error(`💥 处理工作表 "${sheetName}" 数据时出错:`, sheetError);
              // 继续处理其他工作表
              continue;
            }
          }
          
          if (sheets.length === 0) {
            console.error('❌ Excel文件中没有有效的工作表数据');
            reject(new Error('Excel文件中没有有效的工作表数据'));
            return;
          }
          
          console.log(`🎉 Excel解析成功！共处理 ${sheets.length} 个工作表，合并数据 ${allCombinedData.length} 行`);
          console.log('📊 工作表信息:', sheets.map(s => ({ name: s.name, rows: s.rows.length, columns: s.columns.length })));
          console.log('📋 合并后的列数:', allColumnNames.size);
          
          resolve({ sheets, defaultData: allCombinedData });
          
        } catch (error) {
          console.error('💥 Excel解析错误:', error);
          reject(new Error(`Excel解析失败: ${error instanceof Error ? error.message : '未知错误'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private async ProcessData(rawData: any[], fileName: string, sheets?: SheetInfo[]): Promise<DataSet> {
    if (rawData.length === 0) {
      throw new Error('数据文件为空');
    }

    // 获取列信息
    const columns = this.AnalyzeColumns(rawData);
    
    // 生成统计信息
    const summary = this.GenerateDataSummary(rawData, columns);

    // 处理和清理数据
    const processedRows = this.CleanData(rawData, columns);

    const dataset: DataSet = {
      id: uuidv4(),
      name: fileName.replace(/\.[^/.]+$/, ''), // 移除文件扩展名
      fileName,
      description: sheets && sheets.length > 1 
        ? `从文件 ${fileName} 导入的数据集，已合并 ${sheets.length} 个工作表的数据（共 ${processedRows.length} 行）`
        : `从文件 ${fileName} 导入的数据集`,
      columns,
      rows: processedRows,
      summary,
      createdAt: new Date().toISOString(),
      uploadTime: new Date(),
      size: rawData.length,
      sheets: sheets,
      activeSheetIndex: 0, // 默认选择第一个sheet
    };

    return dataset;
  }

  private AnalyzeColumns(data: any[]): ColumnInfo[] {
    if (data.length === 0) return [];

    const sampleSize = Math.min(data.length, 100); // 分析前100行数据
    const sampleData = data.slice(0, sampleSize);
    const firstRow = data[0];
    
    return Object.keys(firstRow)
      .filter(columnName => columnName !== '_sheet_source') // 排除sheet来源字段
      .map((columnName) => {
        const values = sampleData.map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== '');
        
        return {
          name: columnName,
          type: this.InferColumnType(values),
          nullable: values.length < sampleData.length,
          unique: new Set(values).size === values.length,
          examples: values.slice(0, 5), // 取前5个示例值
        };
      });
  }

  private InferColumnType(values: any[]): 'string' | 'number' | 'date' | 'boolean' {
    if (values.length === 0) return 'string';

    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    values.forEach(value => {
      const str = String(value).toLowerCase().trim();
      
      // 检查布尔值
      if (str === 'true' || str === 'false' || str === '是' || str === '否' || str === 'yes' || str === 'no') {
        booleanCount++;
        return;
      }

      // 检查数字
      if (!isNaN(Number(value)) && !isNaN(parseFloat(String(value)))) {
        numberCount++;
        return;
      }

      // 检查日期
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime()) && String(value).match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
        dateCount++;
        return;
      }
    });

    const total = values.length;
    
    if (booleanCount / total > 0.8) return 'boolean';
    if (numberCount / total > 0.8) return 'number';
    if (dateCount / total > 0.8) return 'date';
    
    return 'string';
  }



  private CleanData(data: any[], columns: ColumnInfo[]): any[] {
    return data.map(row => {
      const cleanedRow: any = {};
      
      // 处理普通列
      columns.forEach(col => {
        let value = row[col.name];
        
        // 类型转换
        switch (col.type) {
          case 'number':
            value = value === '' || value === null || value === undefined ? null : Number(value);
            if (isNaN(value)) value = null;
            break;
          case 'date':
            if (value && value !== '') {
              const dateValue = new Date(value);
              value = isNaN(dateValue.getTime()) ? null : dateValue;
            } else {
              value = null;
            }
            break;
          case 'boolean':
            if (typeof value === 'string') {
              const str = value.toLowerCase().trim();
              if (str === 'true' || str === '是' || str === 'yes' || str === '1') {
                value = true;
              } else if (str === 'false' || str === '否' || str === 'no' || str === '0') {
                value = false;
              } else {
                value = null;
              }
            }
            break;
          default:
            value = value === null || value === undefined ? '' : String(value).trim();
        }
        
        cleanedRow[col.name] = value;
      });
      
      // 保留sheet来源信息
      if (row['_sheet_source']) {
        cleanedRow['_sheet_source'] = row['_sheet_source'];
      }
      
      return cleanedRow;
    });
  }

  // 数据查询功能
  async QueryData(query: string, dataset: DataSet): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // 这里简化处理，实际可以实现更复杂的查询语言解析
      const result = this.ExecuteSimpleQuery(query, dataset);
      
      const executionTime = Date.now() - startTime;
      
      return {
        data: result.data,
        columns: result.columns,
        rowCount: result.data.length,
        executionTime,
      };
    } catch (error) {
      throw new Error(`查询执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private ExecuteSimpleQuery(query: string, dataset: DataSet): { data: any[], columns: string[] } {
    // 简单的关键词搜索实现
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 0);
    
    if (keywords.length === 0) {
      return {
        data: dataset.rows,
        columns: dataset.columns.map(col => col.name),
      };
    }

    const filteredData = dataset.rows.filter(row => {
      return keywords.some(keyword => {
        return Object.values(row).some(value => {
          return String(value).toLowerCase().includes(keyword);
        });
      });
    });

    return {
      data: filteredData,
      columns: dataset.columns.map(col => col.name),
    };
  }

  // 获取数据集统计信息
  GetDatasetStats(dataset: DataSet): Record<string, any> {
    const stats: Record<string, any> = {};

    dataset.columns.forEach(column => {
      if (column.type === 'number') {
        const values = dataset.rows
          .map(row => row[column.name])
          .filter(val => val !== null && !isNaN(val))
          .map(val => Number(val));

        if (values.length > 0) {
          stats[column.name] = {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            sum: values.reduce((sum, val) => sum + val, 0),
          };
        }
      } else if (column.type === 'string') {
        const values = dataset.rows
          .map(row => row[column.name])
          .filter(val => val !== null && val !== '');

        const uniqueValues = [...new Set(values)];
        
        stats[column.name] = {
          count: values.length,
          unique: uniqueValues.length,
          mostFrequent: this.GetMostFrequent(values),
        };
      }
    });

    return stats;
  }

  private GetMostFrequent(values: any[]): { value: any; count: number } | null {
    if (values.length === 0) return null;

    const frequency: Record<string, number> = {};
    values.forEach(value => {
      const key = String(value);
      frequency[key] = (frequency[key] || 0) + 1;
    });

    const mostFrequentKey = Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );

    return {
      value: mostFrequentKey,
      count: frequency[mostFrequentKey],
    };
  }

  // 获取支持的文件格式
  GetSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }

  // 获取文件大小限制
  GetMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  // 切换到指定的工作表
  SwitchToSheet(dataset: DataSet, sheetIndex: number): DataSet {
    if (!dataset.sheets || sheetIndex < 0 || sheetIndex >= dataset.sheets.length) {
      throw new Error('无效的工作表索引');
    }

    const targetSheet = dataset.sheets[sheetIndex];
    
    return {
      ...dataset,
      columns: targetSheet.columns,
      rows: targetSheet.rows,
      summary: targetSheet.summary,
      activeSheetIndex: sheetIndex,
      description: dataset.sheets.length > 1 
        ? `从文件 ${dataset.fileName} 导入的数据集，当前工作表: ${targetSheet.name}`
        : dataset.description
    };
  }

  // 获取工作表名称列表
  GetSheetNames(dataset: DataSet): string[] {
    if (!dataset.sheets) {
      return [];
    }
    return dataset.sheets.map(sheet => sheet.name);
  }

  // 获取按sheet分组的数据统计
  GetSheetDataStats(dataset: DataSet): Record<string, { count: number; percentage: number }> {
    const stats: Record<string, { count: number; percentage: number }> = {};
    const totalRows = dataset.rows.length;
    
    if (totalRows === 0) {
      return stats;
    }
    
    // 统计每个sheet的数据行数
    dataset.rows.forEach(row => {
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

  // 过滤指定sheet的数据
  FilterDataBySheet(dataset: DataSet, sheetName: string): any[] {
    return dataset.rows.filter(row => row['_sheet_source'] === sheetName);
  }

  // 重新生成数据统计信息（用于数据更新后）
  GenerateDataSummary(rows: any[], columns: ColumnInfo[]): DataSummary {
    if (!rows || rows.length === 0) {
      return {
        totalRows: 0,
        totalColumns: columns.length,
        numericColumns: columns.filter(col => col.type === 'number').length,
        stringColumns: columns.filter(col => col.type === 'string').length,
        dateColumns: columns.filter(col => col.type === 'date').length,
        missingValues: 0,
        duplicateRows: 0
      };
    }

    // 计算缺失值
    let missingValues = 0;
    rows.forEach(row => {
      columns.forEach(col => {
        const value = row[col.name];
        if (value === null || value === undefined || value === '') {
          missingValues++;
        }
      });
    });

    // 计算重复行
    const rowStrings = rows.map(row => JSON.stringify(row));
    const uniqueRowStrings = new Set(rowStrings);
    const duplicateRows = rows.length - uniqueRowStrings.size;

    return {
      totalRows: rows.length,
      totalColumns: columns.length,
      numericColumns: columns.filter(col => col.type === 'number').length,
      stringColumns: columns.filter(col => col.type === 'string').length,
      dateColumns: columns.filter(col => col.type === 'date').length,
      missingValues,
      duplicateRows
    };
  }

  // 生成完整的数据集元数据（AI分析专用）
  GenerateDatasetMetadata(dataset: DataSet, originalFileSize: number): DatasetMetadata {
    const startTime = Date.now();
    
    console.log('🔍 开始生成数据集元数据...');
    
    // 基本信息
    const basic = {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description || '',
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    };

    // 文件信息
    const file = {
      fileName: dataset.fileName,
      fileSize: originalFileSize,
      fileSizeFormatted: this.FormatFileSize(originalFileSize),
      fileType: this.GetFileType(dataset.fileName),
      fileExtension: this.GetFileExtension(dataset.fileName),
      uploadTime: dataset.uploadTime,
      processingTime: Date.now() - startTime
    };

    // 数据结构信息
    const actualDataRows = dataset.rows.filter(row => 
      Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '')
    ).length;
    
    const structure = {
      totalRows: dataset.summary.totalRows,
      totalColumns: dataset.summary.totalColumns,
      actualDataRows: actualDataRows,
      columnTypes: {
        string: dataset.summary.stringColumns,
        number: dataset.summary.numericColumns,
        date: dataset.summary.dateColumns,
        boolean: dataset.columns.filter(col => col.type === 'boolean').length
      },
      memoryUsage: this.EstimateMemoryUsage(dataset.rows, dataset.columns)
    };

    // 增强的列信息
    const columns = this.GenerateEnhancedColumnInfo(dataset);

    // 数据质量信息
    const quality = this.AnalyzeDataQuality(dataset);

    // 统计信息
    const statistics = this.GenerateStatistics(dataset);

    // Excel特定信息
    const excel = dataset.sheets ? this.GenerateExcelMetadata(dataset) : undefined;

    // 数据预览
    const preview = this.GenerateDataPreview(dataset);

    // 业务语义推断
    const semantics = this.InferBusinessSemantics(dataset);

    // 可视化建议
    const visualization = this.GenerateVisualizationSuggestions(dataset);

    const metadata: DatasetMetadata = {
      basic,
      file,
      structure,
      columns,
      quality,
      statistics,
      excel,
      preview,
      semantics,
      visualization
    };

    console.log('✅ 数据集元数据生成完成，耗时:', Date.now() - startTime, 'ms');
    console.log('📊 元数据概览:', {
      columns: metadata.columns.length,
      qualityScore: metadata.quality.consistency.score,
      businessDomain: metadata.semantics.businessDomain,
      recommendedCharts: metadata.visualization.recommendedChartTypes
    });

    return metadata;
  }

  // 生成增强的列信息
  private GenerateEnhancedColumnInfo(dataset: DataSet): EnhancedColumnInfo[] {
    return dataset.columns.map(col => {
      const columnData = dataset.rows.map(row => row[col.name]);
      const validData = columnData.filter(val => val !== null && val !== undefined && String(val).trim() !== '');
      
      const enhanced: EnhancedColumnInfo = {
        ...col,
        statistics: {
          count: validData.length,
          nullCount: columnData.length - validData.length,
          uniqueCount: new Set(validData).size,
          nullRate: Math.round(((columnData.length - validData.length) / columnData.length) * 100),
          uniqueRate: Math.round((new Set(validData).size / validData.length) * 100)
        }
      };

      // 根据列类型添加特定统计信息
      if (col.type === 'number') {
        enhanced.numericStats = this.CalculateNumericStats(validData);
      } else if (col.type === 'string') {
        enhanced.textStats = this.CalculateTextStats(validData);
      } else if (col.type === 'date') {
        enhanced.dateStats = this.CalculateDateStats(validData);
      }

      // 业务语义推断
      enhanced.semanticType = this.InferSemanticType(col.name, validData, col.type);

      return enhanced;
    });
  }

  // 计算数值统计
  private CalculateNumericStats(data: any[]): any {
    const numbers = data.map(Number).filter(n => !isNaN(n));
    if (numbers.length === 0) return undefined;

    numbers.sort((a, b) => a - b);
    const len = numbers.length;
    
    const min = numbers[0];
    const max = numbers[len - 1];
    const mean = numbers.reduce((sum, n) => sum + n, 0) / len;
    
    const median = len % 2 === 0 
      ? (numbers[len / 2 - 1] + numbers[len / 2]) / 2
      : numbers[Math.floor(len / 2)];

    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / len;
    const std = Math.sqrt(variance);

    const q1 = numbers[Math.floor(len * 0.25)];
    const q3 = numbers[Math.floor(len * 0.75)];
    const iqr = q3 - q1;
    
    const outliers = numbers.filter(n => n < q1 - 1.5 * iqr || n > q3 + 1.5 * iqr).length;

    return {
      min,
      max,
      mean: Math.round(mean * 100) / 100,
      median,
      std: Math.round(std * 100) / 100,
      quartiles: [q1, median, q3] as [number, number, number],
      outliers
    };
  }

  // 计算文本统计
  private CalculateTextStats(data: any[]): any {
    const texts = data.map(String);
    if (texts.length === 0) return undefined;

    const lengths = texts.map(t => t.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    const avgLength = Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length);

    // 统计常见值
    const valueCounts = new Map<string, number>();
    texts.forEach(text => {
      valueCounts.set(text, (valueCounts.get(text) || 0) + 1);
    });

    const commonValues = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / texts.length) * 100)
      }));

    // 识别模式
    const patterns: string[] = [];
    if (texts.some(t => /^\d+$/.test(t))) patterns.push('数字字符串');
    if (texts.some(t => /^[A-Z0-9]+$/.test(t))) patterns.push('代码/ID');
    if (texts.some(t => /\w+@\w+\.\w+/.test(t))) patterns.push('邮箱格式');
    if (texts.some(t => /^\d{4}-\d{2}-\d{2}/.test(t))) patterns.push('日期格式');

    return {
      minLength,
      maxLength,
      avgLength,
      patterns,
      commonValues
    };
  }

  // 计算日期统计
  private CalculateDateStats(data: any[]): any {
    const dates = data.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return undefined;

    dates.sort((a, b) => a.getTime() - b.getTime());
    
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    const dateRange = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    // 推断粒度
    let granularity: string = 'day';
    if (dateRange < 1) granularity = 'hour';
    if (dateRange > 365) granularity = 'month';
    if (dateRange > 365 * 5) granularity = 'year';

    // 检测格式
    const originalStrings = data.slice(0, 10).map(String);
    const commonFormats: string[] = [];
    if (originalStrings.some(s => /\d{4}-\d{2}-\d{2}/.test(s))) commonFormats.push('YYYY-MM-DD');
    if (originalStrings.some(s => /\d{2}\/\d{2}\/\d{4}/.test(s))) commonFormats.push('MM/DD/YYYY');
    if (originalStrings.some(s => /\d{2}-\d{2}-\d{4}/.test(s))) commonFormats.push('DD-MM-YYYY');

    return {
      minDate,
      maxDate,
      dateRange,
      granularity,
      commonFormats,
      timePatterns: []
    };
  }

  // 推断语义类型
  private InferSemanticType(columnName: string, data: any[], dataType: string): any {
    const name = columnName.toLowerCase();
    let category = 'other';
    let confidence = 0;
    const possibleMeanings: string[] = [];

    // 基于列名推断
    if (name.includes('id') || name.includes('key') || name.includes('code')) {
      category = 'identifier';
      confidence = 0.8;
      possibleMeanings.push('唯一标识符');
    } else if (name.includes('date') || name.includes('time') || dataType === 'date') {
      category = 'date';
      confidence = 0.9;
      possibleMeanings.push('时间维度');
    } else if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('value')) {
      category = 'measure';
      confidence = 0.7;
      possibleMeanings.push('金额度量');
    } else if (name.includes('count') || name.includes('number') || name.includes('qty') || name.includes('quantity')) {
      category = 'measure';
      confidence = 0.6;
      possibleMeanings.push('数量度量');
    } else if (name.includes('name') || name.includes('type') || name.includes('category') || name.includes('status')) {
      category = 'dimension';
      confidence = 0.7;
      possibleMeanings.push('分类维度');
    }

    // 基于数据特征推断
    if (dataType === 'string' && data.length > 0) {
      const uniqueRate = new Set(data).size / data.length;
      if (uniqueRate > 0.95) {
        category = 'identifier';
        confidence = Math.max(confidence, 0.6);
        possibleMeanings.push('高唯一性标识');
      } else if (uniqueRate < 0.1) {
        category = 'dimension';
        confidence = Math.max(confidence, 0.5);
        possibleMeanings.push('低基数分类');
      }
    }

    return {
      category,
      confidence,
      possibleMeanings
    };
  }

  // 生成统计信息
  private GenerateStatistics(dataset: DataSet): any {
    const numericColumns: ColumnStatistics[] = [];
    const categoricalColumns: CategoryStatistics[] = [];
    const dateColumns: DateStatistics[] = [];

    dataset.columns.forEach(col => {
      const columnData = dataset.rows.map(row => row[col.name]).filter(val => 
        val !== null && val !== undefined && String(val).trim() !== ''
      );

      if (col.type === 'number') {
        const stats = this.CalculateNumericStats(columnData);
        if (stats) {
          numericColumns.push({
            name: col.name,
            min: stats.min,
            max: stats.max,
            mean: stats.mean,
            median: stats.median,
            std: stats.std,
            quartiles: stats.quartiles,
            distribution: this.InferDistribution(columnData) as 'normal' | 'skewed' | 'uniform' | 'bimodal' | 'unknown',
            outliers: []
          });
        }
      } else if (col.type === 'string') {
        const uniqueValues = new Set(columnData).size;
        const valueCounts = new Map<string, number>();
        columnData.forEach(val => {
          const str = String(val);
          valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
        });

        const topValues = Array.from(valueCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([value, count]) => ({
            value,
            count,
            percentage: Math.round((count / columnData.length) * 100)
          }));

        categoricalColumns.push({
          name: col.name,
          uniqueValues,
          topValues,
          entropy: this.CalculateEntropy(Array.from(valueCounts.values())),
          cardinality: uniqueValues < 10 ? 'low' : uniqueValues < 100 ? 'medium' : 'high'
        });
      } else if (col.type === 'date') {
        const dateStats = this.CalculateDateStats(columnData);
        if (dateStats) {
          dateColumns.push({
            name: col.name,
            minDate: dateStats.minDate,
            maxDate: dateStats.maxDate,
            dateRange: dateStats.dateRange,
            granularity: dateStats.granularity as any,
            gaps: 0,
            trends: []
          });
        }
      }
    });

    return {
      numericColumns,
      categoricalColumns,
      dateColumns
    };
  }

  // 生成Excel元数据
  private GenerateExcelMetadata(dataset: DataSet): any {
    if (!dataset.sheets) return undefined;

    const sheetsInfo: SheetMetadata[] = dataset.sheets.map((sheet, index) => ({
      name: sheet.name,
      index,
      rows: sheet.rows.length,
      columns: sheet.columns.length,
      dataType: this.InferSheetDataType(sheet),
      purpose: this.InferSheetPurpose(sheet),
      keyColumns: this.FindKeyColumns(sheet.columns)
    }));

    const dataSourceDistribution = this.GetSheetDataStats(dataset);

    return {
      totalSheets: dataset.sheets.length,
      sheetsInfo,
      dataSourceDistribution,
      crossSheetRelations: this.FindCrossSheetRelations(dataset.sheets)
    };
  }

  // 生成数据预览
  private GenerateDataPreview(dataset: DataSet): any {
    const sampleSize = Math.min(5, dataset.rows.length);
    const sampleRows = dataset.rows.slice(0, sampleSize);
    
    // 随机抽样
    const randomIndices = Array.from({ length: Math.min(10, dataset.rows.length) }, () => 
      Math.floor(Math.random() * dataset.rows.length)
    );
    const randomSample = randomIndices.map(i => dataset.rows[i]);
    
    // 代表性行（包含不同数据模式的行）
    const representativeRows = this.SelectRepresentativeRows(dataset);

    return {
      sampleRows,
      sampleSize,
      randomSample,
      representativeRows
    };
  }

  // 推断业务语义
  private InferBusinessSemantics(dataset: DataSet): any {
    const possibleKeyColumns: string[] = [];
    const possibleDateColumns: string[] = [];
    const possibleCurrencyColumns: string[] = [];
    const possibleCategoryColumns: string[] = [];

    dataset.columns.forEach(col => {
      const name = col.name.toLowerCase();
      
      if (col.unique || name.includes('id') || name.includes('key')) {
        possibleKeyColumns.push(col.name);
      }
      
      if (col.type === 'date' || name.includes('date') || name.includes('time')) {
        possibleDateColumns.push(col.name);
      }
      
      if (name.includes('price') || name.includes('cost') || name.includes('amount') || name.includes('value')) {
        possibleCurrencyColumns.push(col.name);
      }
      
      if (col.type === 'string' && !col.unique) {
        possibleCategoryColumns.push(col.name);
      }
    });

    const tableType = this.InferTableType(dataset);
    const businessDomain = this.InferBusinessDomain(dataset);

    return {
      possibleKeyColumns,
      possibleDateColumns,
      possibleCurrencyColumns,
      possibleCategoryColumns,
      tableType,
      businessDomain
    };
  }

  // 生成可视化建议
  private GenerateVisualizationSuggestions(dataset: DataSet): any {
    const recommendedChartTypes: string[] = [];
    const keyColumns: string[] = [];
    const trends: string[] = [];
    const correlations: string[] = [];

    const numericCols = dataset.columns.filter(col => col.type === 'number');
    const dateCols = dataset.columns.filter(col => col.type === 'date');
    const categoryCols = dataset.columns.filter(col => col.type === 'string' && !col.unique);

    // 基于数据特征推荐图表类型
    if (dateCols.length > 0 && numericCols.length > 0) {
      recommendedChartTypes.push('line', 'area');
      trends.push('时间序列分析');
    }

    if (categoryCols.length > 0 && numericCols.length > 0) {
      recommendedChartTypes.push('bar', 'column');
    }

    if (categoryCols.length > 0) {
      recommendedChartTypes.push('pie', 'doughnut');
    }

    if (numericCols.length >= 2) {
      recommendedChartTypes.push('scatter');
      correlations.push('数值相关性分析');
    }

    // 识别关键列
    keyColumns.push(...dataset.columns.filter(col => col.unique).map(col => col.name));
    keyColumns.push(...dateCols.map(col => col.name));
    keyColumns.push(...numericCols.slice(0, 3).map(col => col.name));

    return {
      recommendedChartTypes: [...new Set(recommendedChartTypes)],
      keyColumns: [...new Set(keyColumns)],
      trends,
      correlations
    };
  }

  // 分析数据质量
  private AnalyzeDataQuality(dataset: DataSet): any {
    const totalCells = dataset.rows.length * dataset.columns.length;
    let filledCells = 0;
    let emptyCells = 0;
    const issues: DataQualityIssue[] = [];

    // 计算完整性
    dataset.rows.forEach(row => {
      dataset.columns.forEach(col => {
        const value = row[col.name];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          filledCells++;
        } else {
          emptyCells++;
        }
      });
    });

    const completenessRate = Math.round((filledCells / totalCells) * 100);

    // 检查重复行
    const rowStrings = dataset.rows.map(row => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings).size;
    const duplicateRows = dataset.rows.length - uniqueRows;
    const duplicateRate = Math.round((duplicateRows / dataset.rows.length) * 100);

    // 检查数据质量问题
    if (emptyCells > totalCells * 0.1) {
      issues.push({
        type: 'missing_values',
        description: `数据集中有 ${emptyCells} 个空值，占总数据的 ${Math.round((emptyCells / totalCells) * 100)}%`,
        count: emptyCells,
        severity: emptyCells > totalCells * 0.3 ? 'high' : 'medium',
        examples: []
      });
    }

    if (duplicateRows > 0) {
      issues.push({
        type: 'duplicates',
        description: `发现 ${duplicateRows} 行重复数据`,
        count: duplicateRows,
        severity: duplicateRows > dataset.rows.length * 0.1 ? 'high' : 'low',
        examples: []
      });
    }

    // 计算质量分数
    let score = 100;
    score -= Math.min(30, (emptyCells / totalCells) * 100);
    score -= Math.min(20, duplicateRate);
    score = Math.max(0, Math.round(score));

    return {
      completeness: {
        totalCells,
        filledCells,
        emptyCells,
        completenessRate
      },
      uniqueness: {
        totalRows: dataset.rows.length,
        uniqueRows,
        duplicateRows,
        duplicateRate
      },
      consistency: {
        issues,
        score
      }
    };
  }

  // 辅助方法
  private FormatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private GetFileType(fileName: string): string {
    const ext = this.GetFileExtension(fileName);
    const types: Record<string, string> = {
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    };
    return types[ext] || 'unknown';
  }

  private EstimateMemoryUsage(rows: any[], columns: ColumnInfo[]): number {
    let totalSize = 0;
    rows.forEach(row => {
      columns.forEach(col => {
        const value = row[col.name];
        if (value !== null && value !== undefined) {
          totalSize += String(value).length * 2;
        }
      });
    });
    return totalSize;
  }

  private InferDistribution(data: number[]): string {
    const numbers = data.map(Number).filter(n => !isNaN(n));
    if (numbers.length < 10) return 'unknown';
    
    numbers.sort((a, b) => a - b);
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const median = numbers[Math.floor(numbers.length / 2)];
    
    if (Math.abs(mean - median) < (numbers[numbers.length - 1] - numbers[0]) * 0.1) {
      return 'normal';
    }
    return 'skewed';
  }

  private CalculateEntropy(frequencies: number[]): number {
    const total = frequencies.reduce((sum, freq) => sum + freq, 0);
    if (total === 0) return 0;
    
    return -frequencies
      .map(freq => freq / total)
      .filter(p => p > 0)
      .reduce((entropy, p) => entropy + p * Math.log2(p), 0);
  }

  private InferSheetDataType(sheet: SheetInfo): string {
    const numericRatio = sheet.columns.filter(col => col.type === 'number').length / sheet.columns.length;
    if (numericRatio > 0.7) return 'numeric';
    if (numericRatio > 0.3) return 'mixed';
    return 'categorical';
  }

  private InferSheetPurpose(sheet: SheetInfo): string {
    const name = sheet.name.toLowerCase();
    if (name.includes('summary') || name.includes('total')) return 'summary';
    if (name.includes('detail') || name.includes('raw')) return 'detail';
    if (name.includes('config') || name.includes('setting')) return 'configuration';
    return 'data';
  }

  private FindKeyColumns(columns: ColumnInfo[]): string[] {
    return columns
      .filter(col => col.unique || col.name.toLowerCase().includes('id'))
      .map(col => col.name);
  }

  private FindCrossSheetRelations(sheets: SheetInfo[]): string[] {
    const relations: string[] = [];
    const allColumns = new Set<string>();
    
    sheets.forEach(sheet => {
      sheet.columns.forEach(col => allColumns.add(col.name));
    });

    const commonColumns = Array.from(allColumns).filter(colName => {
      const sheetsWithColumn = sheets.filter(sheet => 
        sheet.columns.some(col => col.name === colName)
      );
      return sheetsWithColumn.length > 1;
    });

    commonColumns.forEach(colName => {
      relations.push(`列 "${colName}" 出现在多个工作表中，可能是关联字段`);
    });

    return relations;
  }

  private SelectRepresentativeRows(dataset: DataSet): any[] {
    const rows = dataset.rows;
    if (rows.length <= 5) return rows;

    const representatives: any[] = [];
    representatives.push(rows[0]);
    representatives.push(rows[Math.floor(rows.length / 2)]);
    representatives.push(rows[rows.length - 1]);
    
    const randomIndices = Array.from({ length: 2 }, () => 
      Math.floor(Math.random() * rows.length)
    );
    randomIndices.forEach(i => representatives.push(rows[i]));

    return representatives;
  }

  private InferTableType(dataset: DataSet): string {
    const hasUniqueKey = dataset.columns.some(col => col.unique);
    const hasDateColumn = dataset.columns.some(col => col.type === 'date');
    const numericRatio = dataset.columns.filter(col => col.type === 'number').length / dataset.columns.length;

    if (hasUniqueKey && hasDateColumn && numericRatio > 0.3) {
      return 'transactional';
    } else if (numericRatio > 0.6) {
      return 'analytical';
    } else if (hasUniqueKey && !hasDateColumn) {
      return 'master';
    } else if (dataset.rows.length < 100 && numericRatio < 0.3) {
      return 'reference';
    }
    
    return 'unknown';
  }

  private InferBusinessDomain(dataset: DataSet): string[] {
    const domains: string[] = [];
    const columnNames = dataset.columns.map(col => col.name.toLowerCase()).join(' ');

    const domainKeywords = {
      sales: ['sales', 'revenue', 'customer', 'order', 'product'],
      finance: ['amount', 'cost', 'price', 'budget', 'expense'],
      marketing: ['campaign', 'lead', 'conversion', 'click', 'impression'],
      hr: ['employee', 'salary', 'department', 'position', 'hire'],
      operations: ['process', 'workflow', 'status', 'task', 'project'],
      inventory: ['stock', 'quantity', 'warehouse', 'item', 'supplier']
    };

    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (keywords.some(keyword => columnNames.includes(keyword))) {
        domains.push(domain);
      }
    });

    return domains.length > 0 ? domains : ['unknown'];
  }
}

export const dataService = new DataService();
