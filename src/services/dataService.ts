// 数据处理服务

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { DataSet, ColumnInfo, DataSummary, QueryResult, DataUploadResult } from '../types';

class DataService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly SUPPORTED_FORMATS = ['.csv', '.xlsx', '.xls'];

  async UploadFile(file: File): Promise<DataUploadResult> {
    try {
      // 验证文件
      const validation = this.ValidateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // 解析文件
      const rawData = await this.ParseFile(file);
      
      // 处理数据
      const dataset = await this.ProcessData(rawData, file.name);

      return {
        success: true,
        dataset,
      };
    } catch (error) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文件上传失败',
      };
    }
  }

  private ValidateFile(file: File): { isValid: boolean; error?: string } {
    // 检查文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `文件大小超过限制 (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }

    // 检查文件格式
    const extension = this.GetFileExtension(file.name);
    if (!this.SUPPORTED_FORMATS.includes(extension)) {
      return {
        isValid: false,
        error: `不支持的文件格式，请上传 ${this.SUPPORTED_FORMATS.join(', ')} 格式的文件`,
      };
    }

    return { isValid: true };
  }

  private GetFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private async ParseFile(file: File): Promise<any[]> {
    const extension = this.GetFileExtension(file.name);

    if (extension === '.csv') {
      return this.ParseCSV(file);
    } else if (extension === '.xlsx' || extension === '.xls') {
      return this.ParseExcel(file);
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

  private async ParseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 读取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          }) as any[][];

          if (jsonData.length === 0) {
            reject(new Error('Excel文件为空'));
            return;
          }

          // 使用第一行作为表头
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1);

          const result = rows.map((row) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });

          resolve(result);
        } catch (error) {
          reject(new Error(`Excel解析失败: ${error instanceof Error ? error.message : '未知错误'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private async ProcessData(rawData: any[], fileName: string): Promise<DataSet> {
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
      columns,
      rows: processedRows,
      summary,
      uploadTime: new Date(),
      size: rawData.length,
    };

    return dataset;
  }

  private AnalyzeColumns(data: any[]): ColumnInfo[] {
    if (data.length === 0) return [];

    const sampleSize = Math.min(data.length, 100); // 分析前100行数据
    const sampleData = data.slice(0, sampleSize);
    const firstRow = data[0];
    
    return Object.keys(firstRow).map((columnName) => {
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

  private GenerateDataSummary(data: any[], columns: ColumnInfo[]): DataSummary {
    const numericColumns = columns.filter(col => col.type === 'number').length;
    const stringColumns = columns.filter(col => col.type === 'string').length;
    const dateColumns = columns.filter(col => col.type === 'date').length;

    // 计算缺失值
    let missingValues = 0;
    data.forEach(row => {
      columns.forEach(col => {
        const value = row[col.name];
        if (value === null || value === undefined || value === '') {
          missingValues++;
        }
      });
    });

    // 计算重复行
    const rowStrings = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    const duplicateRows = data.length - uniqueRows.size;

    return {
      totalRows: data.length,
      totalColumns: columns.length,
      numericColumns,
      stringColumns,
      dateColumns,
      missingValues,
      duplicateRows,
    };
  }

  private CleanData(data: any[], columns: ColumnInfo[]): any[] {
    return data.map(row => {
      const cleanedRow: any = {};
      
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
}

export const dataService = new DataService();
