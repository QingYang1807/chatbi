// 数据处理服务

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { DataSet, ColumnInfo, DataSummary, QueryResult, DataUploadResult, SheetInfo } from '../types';

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
}

export const dataService = new DataService();
