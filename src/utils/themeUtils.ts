// 主题工具函数

// 主题工具函数

export type ThemeType = 'light' | 'dark' | 'auto';

/**
 * 获取当前实际主题
 */
export const GetCurrentTheme = (userTheme: ThemeType): 'light' | 'dark' => {
  if (userTheme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return userTheme;
};

/**
 * 应用主题到文档
 */
export const ApplyTheme = (theme: ThemeType): void => {
  const actualTheme = GetCurrentTheme(theme);
  const root = document.documentElement;
  
  // 移除现有主题类
  root.classList.remove('theme-light', 'theme-dark');
  
  // 添加新主题类
  root.classList.add(`theme-${actualTheme}`);
  
  // 设置data属性供CSS使用
  root.setAttribute('data-theme', actualTheme);
  
  // 更新Ant Design主题
  if (actualTheme === 'dark') {
    root.style.setProperty('--ant-primary-color', '#1677ff');
    root.style.setProperty('--ant-bg-color', '#141414');
    root.style.setProperty('--ant-text-color', '#ffffff');
  } else {
    root.style.setProperty('--ant-primary-color', '#1677ff');
    root.style.setProperty('--ant-bg-color', '#ffffff');
    root.style.setProperty('--ant-text-color', '#000000');
  }
};

/**
 * 监听系统主题变化
 */
export const WatchSystemTheme = (callback: (theme: 'light' | 'dark') => void): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // 返回清理函数
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
};

/**
 * 初始化主题
 */
export const InitializeTheme = (userTheme: ThemeType): void => {
  ApplyTheme(userTheme);
  
  // 如果用户设置为跟随系统，监听系统主题变化
  if (userTheme === 'auto') {
    WatchSystemTheme(() => {
      ApplyTheme('auto');
    });
  }
};
