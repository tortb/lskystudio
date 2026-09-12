#!/bin/bash

# Lsky Studio 一键启动脚本
# 使用方法: ./setup.sh [命令]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志目录
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

# 打印带颜色的消息
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log() {
    echo -e "${CYAN}[LOG]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        return 1
    fi
    return 0
}

# 安装 Rust
install_rust() {
    info "安装 Rust..."

    if check_command rustc; then
        local version=$(rustc --version)
        warn "Rust 已安装: $version"
        read -p "是否更新到最新版本? (y/N): " update_rust
        if [[ $update_rust =~ ^[Yy]$ ]]; then
            rustup update
        fi
    else
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
        success "Rust 安装完成!"
    fi

    info "Rust 版本: $(rustc --version)"
}

# 安装 Node.js 依赖
install_dependencies() {
    info "安装 Node.js 依赖..."

    if ! check_command node || ! check_command npm; then
        error "未检测到 Node.js/npm，请先安装: https://nodejs.org/"
    fi

    info "Node: $(node --version) / npm: $(npm --version)"

    # 安装主项目依赖
    npm install

    success "依赖安装完成!"
}

# 基于源图重新生成全平台图标
generate_icons() {
    info "生成应用图标..."

    local source="src-tauri/icons/logo.png"
    if [ ! -f "$source" ]; then
        error "未找到图标源图: $source"
    fi

    npm run icons 2>&1 | tee "$LOG_DIR/icons.log"

    success "图标已生成到 src-tauri/icons/"
}

# 启动开发模式（浏览器，带日志）
start_dev() {
    info "启动开发模式..."
    info "日志文件: $LOG_DIR/frontend.log"

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        warn "未检测到依赖，开始安装..."
        install_dependencies
    fi

    # 杀死已存在的进程
    pkill -f "vite" 2>/dev/null || true
    sleep 1

    # 启动前端（带日志）
    info "启动前端服务..."
    npm run dev 2>&1 | tee "$LOG_DIR/frontend.log" &
    FRONTEND_PID=$!

    success "开发服务已启动!"
    echo ""
    echo "=========================================="
    echo "  前端: http://localhost:5173/"
    echo "=========================================="
    echo ""
    echo "日志文件:"
    echo "  - 前端日志: $LOG_DIR/frontend.log"
    echo ""
    echo "查看日志命令:"
    echo "  tail -f $LOG_DIR/frontend.log"
    echo ""
    echo "按 Ctrl+C 停止服务"
    echo ""

    # 等待用户中断
    trap "kill $FRONTEND_PID 2>/dev/null; echo ''; info '服务已停止'; exit 0" INT TERM
    wait
}

# 查看日志
view_logs() {
    local log_type="${1:-all}"

    case $log_type in
        frontend|fe)
            info "查看前端日志 (Ctrl+C 退出):"
            tail -f "$LOG_DIR/frontend.log"
            ;;
        all|*)
            info "查看所有日志 (Ctrl+C 退出):"
            tail -f "$LOG_DIR"/*.log
            ;;
    esac
}

# 启动 Tauri 开发模式
start_tauri_dev() {
    info "启动 Tauri 开发模式..."

    # 检查 Rust
    if ! check_command rustc; then
        error "未安装 Rust，请先运行: ./setup.sh setup"
    fi

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        warn "未检测到依赖，开始安装..."
        install_dependencies
    fi

    # 启动 Tauri
    npm run dev:app 2>&1 | tee "$LOG_DIR/tauri.log"
}

# 构建应用
build_app() {
    info "构建应用..."

    # 检查 Rust
    if ! check_command rustc; then
        error "未安装 Rust，请先运行: ./setup.sh setup"
    fi

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        warn "未检测到依赖，开始安装..."
        install_dependencies
    fi

    # 构建
    npm run build:app 2>&1 | tee "$LOG_DIR/build.log"

    success "构建完成!"
    echo ""
    echo "安装包位置: src-tauri/target/release/bundle/"
}

# 清理缓存
clean_cache() {
    info "清理缓存..."

    # 清理前端缓存
    rm -rf dist
    rm -rf node_modules/.vite

    # 清理 Rust 缓存
    if [ -d "src-tauri/target" ]; then
        rm -rf src-tauri/target
    fi

    # 清理日志
    rm -rf "$LOG_DIR"

    success "缓存已清理!"
}

# 显示帮助
show_help() {
    echo "Lsky Studio 一键启动脚本"
    echo ""
    echo "使用方法: ./setup.sh [命令]"
    echo ""
    echo "命令:"
    echo "  setup       首次安装设置（安装 Rust 和依赖）"
    echo "  dev         启动开发模式（浏览器，带日志）"
    echo "  tauri       启动 Tauri 开发模式（需要 Rust）"
    echo "  build       本地构建应用（正式发布由 GitHub Actions 完成）"
    echo "  icons       基于 src-tauri/icons/logo.png 重新生成全平台图标"
    echo "  clean       清理构建缓存"
    echo "  logs        查看所有日志"
    echo "  logs fe     查看前端日志"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./setup.sh setup      # 首次设置"
    echo "  ./setup.sh dev        # 启动开发"
    echo "  ./setup.sh logs       # 查看日志"
    echo "  ./setup.sh logs fe    # 查看前端日志"
}

# 主函数
main() {
    cd "$(dirname "$0")"

    case "${1:-help}" in
        setup)
            install_rust
            install_dependencies
            success "设置完成! 现在可以运行: ./setup.sh dev"
            ;;
        dev)
            start_dev
            ;;
        tauri)
            start_tauri_dev
            ;;
        build)
            build_app
            ;;
        icons)
            generate_icons
            ;;
        clean)
            clean_cache
            ;;
        logs)
            view_logs "${2:-all}"
            ;;
        help|*)
            show_help
            ;;
    esac
}

main "$@"
