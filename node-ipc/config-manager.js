/**
 * 配置管理器
 * 管理应用配置，支持读取和保存
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(ipcHandler) {
    this.ipc = ipcHandler;
    this.configPath = null;
    this.config = this.getDefaultConfig();
  }

  /**
   * 注册配置相关命令
   */
  registerCommands() {
    this.ipc.registerCommand('config_get', () => this.getConfig());
    this.ipc.registerCommand('config_update', (params) => this.updateConfig(params));
    this.ipc.registerCommand('config_test_connection', (params) => this.testConnection(params));
    this.ipc.registerCommand('config_get_strategies', (params) => this.getStrategies(params));
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      apiUrl: '',
      apiToken: '',
      strategyId: '1',
      concurrency: 3,
      retryCount: 3,
      retryDelay: 1000,
      proxyEnabled: false,
      proxyUrl: '',
      theme: 'system',
      language: 'zh-CN',
      autoCopyUrl: true,
      compressEnabled: false,
      compressQuality: 80
    };
  }

  /**
   * 设置配置文件路径
   */
  setConfigPath(configPath) {
    this.configPath = configPath;
    this.loadConfig();
  }

  /**
   * 加载配置
   */
  loadConfig() {
    if (!this.configPath) return;

    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(data);
        this.config = { ...this.getDefaultConfig(), ...loadedConfig };
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  /**
   * 保存配置
   */
  saveConfig() {
    if (!this.configPath) return;

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  /**
   * 获取配置
   */
  async getConfig() {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  async updateConfig(params) {
    const updates = params || {};

    // 验证配置
    if (updates.concurrency !== undefined) {
      if (updates.concurrency < 1 || updates.concurrency > 20) {
        throw { code: 'INVALID_CONFIG', message: '并发数必须在 1-20 之间' };
      }
    }

    // 更新配置
    this.config = { ...this.config, ...updates };

    // 保存配置
    this.saveConfig();

    return { success: true, config: this.config };
  }

  /**
   * 测试连接
   */
  async testConnection(params) {
    const { apiUrl, apiToken } = params || {};

    if (!apiUrl || !apiToken) {
      throw { code: 'INVALID_PARAMS', message: 'API URL 和 Token 不能为空' };
    }

    try {
      // 构建测试 URL
      let baseUrl = apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      if (baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.slice(0, -7);
      }

      const testUrl = `${baseUrl}/api/v1/strategies`;

      // 发送测试请求
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // 兼容 status 为 true 或 "success"
      if (data.status === true || data.status === 'success') {
        return {
          success: true,
          version: data.data?.version || data.data?.api_version || '',
          strategies: data.data?.strategies || []
        };
      } else {
        throw new Error(data.message || '连接失败');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取存储策略
   */
  async getStrategies(params) {
    const { apiUrl, apiToken } = params || this.config;

    if (!apiUrl || !apiToken) {
      return { strategies: [] };
    }

    try {
      let baseUrl = apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      if (baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.slice(0, -7);
      }

      const strategiesUrl = `${baseUrl}/api/v1/strategies`;

      const response = await fetch(strategiesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // 兼容 status 为 true 或 "success"
      const isSuccess = data.status === true || data.status === 'success';
      const strategyList = data.data?.strategies || data.data?.data || [];

      if (isSuccess && strategyList.length > 0) {
        return {
          strategies: strategyList.map(s => ({
            id: s.id,
            name: s.name,
            provider: s.provider || 'unknown',
            description: s.intro || ''
          }))
        };
      }

      return { strategies: [] };
    } catch (error) {
      console.error('获取策略失败:', error);
      return { strategies: [] };
    }
  }
}

module.exports = ConfigManager;
