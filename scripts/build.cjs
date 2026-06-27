/**
 * 构建脚本
 * 用于构建和打包 Lsky Studio 应用
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
const TAURI_DIR = path.join(ROOT_DIR, 'src-tauri');

// 执行命令
function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  try {
    execSync(command, {
      cwd: options.cwd || ROOT_DIR,
      stdio: 'inherit',
      ...options,
    });
  } catch (error) {
    console.error(`命令执行失败: ${command}`);
    process.exit(1);
  }
}

// 检查依赖
function checkDependencies() {
  console.log('检查依赖...');

  // 检查 Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    console.log(`Node.js: ${nodeVersion}`);
  } catch {
    console.error('错误: 未安装 Node.js');
    process.exit(1);
  }

  // 检查 Rust
  try {
    const rustVersion = execSync('rustc --version', { encoding: 'utf-8' }).trim();
    console.log(`Rust: ${rustVersion}`);
  } catch {
    console.error('错误: 未安装 Rust');
    process.exit(1);
  }

  // 检查 pnpm
  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
    console.log(`pnpm: ${pnpmVersion}`);
  } catch {
    console.error('警告: 未安装 pnpm，将使用 npm');
  }

  console.log('依赖检查完成\n');
}

// 安装依赖
function installDependencies() {
  console.log('安装依赖...');

  // 安装前端依赖
  run('pnpm install || npm install');

  // 安装 Node IPC 依赖
  run('npm install', { cwd: path.join(ROOT_DIR, 'node-ipc') });

  console.log('依赖安装完成\n');
}

// 构建前端
function buildFrontend() {
  console.log('构建前端...');

  run('pnpm build || npm run build');

  console.log('前端构建完成\n');
}

// 构建 Tauri 应用
function buildTauri(target = null) {
  console.log('构建 Tauri 应用...');

  const command = target
    ? `pnpm tauri build --target ${target}`
    : 'pnpm tauri build';

  run(command);

  console.log('Tauri 构建完成\n');
}

// 复制 Node IPC 文件
function copyNodeIpc() {
  console.log('复制 Node IPC 文件...');

  const sourceDir = path.join(ROOT_DIR, 'node-ipc');
  const targetDir = path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'node-ipc');

  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 复制文件
  const filesToCopy = [
    'index.js',
    'ipc-handler.js',
    'upload-engine.js',
    'config-manager.js',
    'package.json',
    'node_modules',
  ];

  filesToCopy.forEach(file => {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);

    if (fs.existsSync(source)) {
      if (fs.lstatSync(source).isDirectory()) {
        fs.cpSync(source, target, { recursive: true });
      } else {
        fs.copyFileSync(source, target);
      }
      console.log(`  复制: ${file}`);
    }
  });

  console.log('Node IPC 文件复制完成\n');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  console.log('=== Lsky Studio 构建工具 ===\n');

  switch (command) {
    case 'check':
      checkDependencies();
      break;

    case 'install':
      checkDependencies();
      installDependencies();
      break;

    case 'build':
      checkDependencies();
      installDependencies();
      buildFrontend();
      buildTauri();
      copyNodeIpc();
      console.log('构建完成！');
      break;

    case 'build-win':
      checkDependencies();
      installDependencies();
      buildFrontend();
      buildTauri('x86_64-pc-windows-msvc');
      copyNodeIpc();
      console.log('Windows 构建完成！');
      break;

    case 'build-linux':
      checkDependencies();
      installDependencies();
      buildFrontend();
      buildTauri('x86_64-unknown-linux-gnu');
      copyNodeIpc();
      console.log('Linux 构建完成！');
      break;

    case 'dev':
      checkDependencies();
      installDependencies();
      run('pnpm tauri dev || npm run tauri dev');
      break;

    default:
      console.log('用法:');
      console.log('  node scripts/build.cjs [command]');
      console.log('');
      console.log('命令:');
      console.log('  check      检查依赖');
      console.log('  install    安装依赖');
      console.log('  build      构建应用');
      console.log('  build-win  构建 Windows 版本');
      console.log('  build-linux 构建 Linux 版本');
      console.log('  dev        启动开发模式');
      break;
  }
}

main();
