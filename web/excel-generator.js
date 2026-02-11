// 使用SheetJS库生成真正的Excel文件
class ExcelGenerator {
  // 辅助函数：从路径中提取最后一级文件夹名
  static extractLastFolderName(pathOrFolderName) {
    if (!pathOrFolderName) {
      return '';
    }
    
    // 如果包含路径分隔符，则提取最后一级文件夹名
    if (pathOrFolderName.includes('/') || pathOrFolderName.includes('\\')) {
      // 统一使用正斜杠进行分割
      const normalizedPath = pathOrFolderName.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/');
      
      // 查找最后一个非空部分（排除文件名）
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const part = pathParts[i];
        // 如果该部分包含文件扩展名，则它是文件名，跳过它
        if (part && part.includes('.')) {
          continue;
        }
        // 返回第一个不含扩展名的部分（即最后一级文件夹名）
        if (part && !part.includes('.')) {
          return part;
        }
      }
      
      // 如果没找到不含扩展名的部分，返回最后一个部分
      return pathParts[pathParts.length - 1];
    }
    
    // 如果没有路径分隔符，直接返回原值
    return pathOrFolderName;
  }
  
  static async generate(results) {
    // 动态加载SheetJS库
    if (typeof XLSX === 'undefined') {
      await this.loadSheetJS();
    }
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 准备数据
    const data = [
      ['序号', '文件夹名', '文件大小', '上传状态', '图片URL']
    ];
    
    results.forEach((result, index) => {
      data.push([
        index + 1,
        this.extractLastFolderName(result.folderName) || this.extractLastFolderName(result.originalName) || '',
        result.size || '',
        result.status || '',
        result.url || result.data?.public_url || result.links?.url || result.data?.links?.url || ''
      ]);
    });
    
    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    const colWidths = [
      { wch: 8 },  // 序号
      { wch: 20 }, // 文件夹名
      { wch: 12 }, // 文件大小
      { wch: 15 }, // 上传状态
      { wch: 50 }, // 图片URL
    ];
    ws['!cols'] = colWidths;
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '上传结果');
    
    // 生成文件名
    const fileName = `兰空图床上传报告_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
    
    // 下载文件
    XLSX.writeFile(wb, fileName);
  }

  static async loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (typeof XLSX !== 'undefined') {
        resolve(XLSX);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
      script.onload = () => {
        resolve(window.XLSX);
      };
      script.onerror = () => {
        console.warn('无法加载SheetJS，使用CSV格式作为备选方案');
        // 如果加载失败，使用CSV作为备选方案
        this.fallbackToCSV(results);
        reject(new Error('Failed to load SheetJS'));
      };
      document.head.appendChild(script);
    });
  }

  // 备选方案：生成CSV文件
  static generateCSV(results) {
    let csvContent = '序号,文件夹名,文件大小,上传状态,图片URL,缩略图URL\n';
    
    results.forEach((result, index) => {
      const row = [
        index + 1,
        `"${this.extractLastFolderName(result.folderName || result.originalName).replace(/"/g, '""')}"`,
        result.size || '',
        result.status,
        `"${result.url ? result.url.replace(/"/g, '""') : ''}"`,
        `"${result.thumbnailUrl ? result.thumbnailUrl.replace(/"/g, '""') : ''}"`
      ].join(',');
      
      csvContent += row + '\n';
    });

    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `兰空图床上传报告_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}