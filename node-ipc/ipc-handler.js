/**
 * IPC 命令处理器
 * 处理来自 Rust 的命令，并发送事件回 Rust
 */

const readline = require('readline');

class IpcHandler {
  constructor() {
    this.commands = new Map();
    this.eventHandlers = new Map();
    this.setupStdin();
  }

  /**
   * 设置 stdin 监听
   */
  setupStdin() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        this.sendError(null, 'PARSE_ERROR', `解析消息失败: ${error.message}`);
      }
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }

  /**
   * 注册命令处理器
   */
  registerCommand(method, handler) {
    this.commands.set(method, handler);
  }

  /**
   * 处理消息
   */
  async handleMessage(message) {
    const { id, method, params } = message;

    if (!method) {
      this.sendError(id, 'INVALID_MESSAGE', '消息缺少 method 字段');
      return;
    }

    const handler = this.commands.get(method);
    if (!handler) {
      this.sendError(id, 'UNKNOWN_METHOD', `未知的方法: ${method}`);
      return;
    }

    try {
      const result = await handler(params || {});
      this.sendResponse(id, result);
    } catch (error) {
      this.sendError(id, error.code || 'HANDLER_ERROR', error.message);
    }
  }

  /**
   * 发送响应
   */
  sendResponse(id, data) {
    const response = {
      id,
      success: true,
      data
    };
    this.send(response);
  }

  /**
   * 发送错误
   */
  sendError(id, code, message) {
    const response = {
      id,
      success: false,
      error: {
        code,
        message
      }
    };
    this.send(response);
  }

  /**
   * 发送事件
   */
  sendEvent(type, payload) {
    const event = {
      type,
      payload
    };
    this.send(event);
  }

  /**
   * 发送 JSON 消息到 stdout
   */
  send(message) {
    const json = JSON.stringify(message);
    process.stdout.write(json + '\n');
  }
}

module.exports = IpcHandler;
