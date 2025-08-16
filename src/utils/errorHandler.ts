// 错误处理工具

import { message } from 'antd';

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CHART_ERROR = 'CHART_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  HandleError(error: any, context?: string): AppError {
    const appError = this.CreateAppError(error, context);
    this.LogError(appError);
    this.ShowUserMessage(appError);
    return appError;
  }

  /**
   * 创建应用错误对象
   */
  private CreateAppError(error: any, context?: string): AppError {
    let type = ErrorType.UNKNOWN_ERROR;
    let message = '发生未知错误';
    let details = error;

    if (error instanceof Error) {
      message = error.message;
      
      // 根据错误消息判断错误类型
      if (error.message.includes('fetch') || error.message.includes('网络')) {
        type = ErrorType.NETWORK_ERROR;
        message = '网络连接失败，请检查网络设置';
      } else if (error.message.includes('API') || error.message.includes('401') || error.message.includes('403')) {
        type = ErrorType.API_ERROR;
        message = 'API调用失败，请检查配置';
      } else if (error.message.includes('文件') || error.message.includes('上传')) {
        type = ErrorType.FILE_ERROR;
        message = '文件处理失败';
      } else if (error.message.includes('验证') || error.message.includes('格式')) {
        type = ErrorType.VALIDATION_ERROR;
        message = '数据验证失败';
      } else if (error.message.includes('图表') || error.message.includes('渲染')) {
        type = ErrorType.CHART_ERROR;
        message = '图表生成失败';
      } else if (error.message.includes('存储') || error.message.includes('保存')) {
        type = ErrorType.STORAGE_ERROR;
        message = '数据存储失败';
      }
    }

    if (context) {
      message = `${context}: ${message}`;
    }

    return {
      type,
      message,
      details,
      timestamp: new Date(),
    };
  }

  /**
   * 记录错误日志
   */
  private LogError(error: AppError): void {
    console.error('应用错误:', error);
    
    // 保存到错误日志
    this.errorLog.push(error);
    
    // 最多保留100条错误日志
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // 可以在这里添加错误上报逻辑
    // this.reportError(error);
  }

  /**
   * 显示用户友好的错误消息
   */
  private ShowUserMessage(error: AppError): void {
    const userMessage = this.GetUserFriendlyMessage(error);
    
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        message.error(userMessage, 5);
        break;
      case ErrorType.API_ERROR:
        message.error(userMessage, 5);
        break;
      case ErrorType.FILE_ERROR:
        message.warning(userMessage, 4);
        break;
      case ErrorType.VALIDATION_ERROR:
        message.warning(userMessage, 3);
        break;
      case ErrorType.CHART_ERROR:
        message.error(userMessage, 4);
        break;
      case ErrorType.STORAGE_ERROR:
        message.error(userMessage, 4);
        break;
      default:
        message.error(userMessage, 3);
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private GetUserFriendlyMessage(error: AppError): string {
    const friendlyMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络设置后重试',
      [ErrorType.API_ERROR]: 'AI服务暂时不可用，请检查API配置或稍后重试',
      [ErrorType.FILE_ERROR]: '文件处理失败，请检查文件格式是否正确',
      [ErrorType.VALIDATION_ERROR]: '输入数据格式不正确，请检查后重试',
      [ErrorType.CHART_ERROR]: '图表生成失败，请尝试其他图表类型',
      [ErrorType.STORAGE_ERROR]: '数据保存失败，请确保浏览器支持本地存储',
      [ErrorType.UNKNOWN_ERROR]: '系统发生未知错误，请刷新页面重试',
    };

    return friendlyMessages[error.type] || error.message;
  }

  /**
   * 获取错误日志
   */
  GetErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   */
  ClearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 导出错误日志
   */
  ExportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }

  /**
   * 网络错误重试机制
   */
  async RetryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt);
        await this.Sleep(delay);
        
        console.warn(`操作失败，第 ${attempt + 1} 次重试...`);
      }
    }
    
    throw this.HandleError(lastError, '重试失败');
  }

  /**
   * 睡眠函数
   */
  private Sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 导出便捷函数
export const HandleError = (error: any, context?: string): AppError => {
  return errorHandler.HandleError(error, context);
};

export const RetryOperation = <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  baseDelay?: number
): Promise<T> => {
  return errorHandler.RetryWithBackoff(operation, maxRetries, baseDelay);
};
