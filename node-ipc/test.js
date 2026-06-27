/**
 * IPC 测试脚本
 * 测试与 Node.js IPC 服务的通信
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('启动 Node.js IPC 服务...');

const nodeProcess = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

nodeProcess.stdout.on('data', (data) => {
  buffer += data.toString();

  // 处理完整的 JSON 行
  const lines = buffer.split('\n');
  buffer = lines.pop(); // 保留不完整的行

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        console.log('收到消息:', JSON.stringify(message, null, 2));
      } catch (e) {
        console.error('解析消息失败:', line);
      }
    }
  });
});

nodeProcess.stderr.on('data', (data) => {
  console.error('stderr:', data.toString());
});

nodeProcess.on('close', (code) => {
  console.log(`进程退出，代码: ${code}`);
});

// 发送测试命令
function sendCommand(method, params = {}) {
  const command = {
    id: `test_${Date.now()}`,
    method,
    params
  };
  console.log('发送命令:', JSON.stringify(command, null, 2));
  nodeProcess.stdin.write(JSON.stringify(command) + '\n');
}

// 等待进程启动后发送测试命令
setTimeout(() => {
  console.log('\n=== 测试 1: 获取版本 ===');
  sendCommand('get_version');
}, 1000);

setTimeout(() => {
  console.log('\n=== 测试 2: 获取状态 ===');
  sendCommand('get_status');
}, 2000);

setTimeout(() => {
  console.log('\n=== 测试 3: 获取配置 ===');
  sendCommand('config_get');
}, 3000);

setTimeout(() => {
  console.log('\n=== 测试 4: 更新配置 ===');
  sendCommand('config_update', {
    apiUrl: 'https://example.com',
    concurrency: 5
  });
}, 4000);

setTimeout(() => {
  console.log('\n=== 测试 5: 获取配置（验证更新） ===');
  sendCommand('config_get');
}, 5000);

// 6秒后退出
setTimeout(() => {
  console.log('\n测试完成，退出...');
  nodeProcess.kill();
  process.exit(0);
}, 6000);
