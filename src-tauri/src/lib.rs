mod config;
mod error;
mod files;
mod upload;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};

use upload::UploadRuntime;

/// 全局状态
pub struct AppState {
    /// 当前配置（JSON 结构，与迁移前 Node 侧保持一致）
    pub config: Mutex<Value>,
    pub config_path: PathBuf,
    pub http: reqwest::Client,
    pub upload: Arc<UploadRuntime>,
    pub started_at: Instant,
}

/// 配置文件路径
fn config_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("config.json")
}

// 窗口控制命令
#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn maximize_window(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

// 应用信息命令
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_app_name() -> String {
    "Lsky Studio".to_string()
}

// 系统状态命令
#[tauri::command]
fn get_version() -> Value {
    json!({ "version": env!("CARGO_PKG_VERSION") })
}

#[tauri::command]
fn get_status(state: State<'_, AppState>) -> Value {
    json!({
        "status": "ready",
        "uptime": state.started_at.elapsed().as_secs_f64(),
        "tasks": state.upload.task_count(),
        "isUploading": state.upload.is_uploading()
    })
}

// 配置读写命令（与 config_* 共用同一份存储）
#[tauri::command]
fn load_config(state: State<'_, AppState>) -> Value {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
async fn save_config(state: State<'_, AppState>, config: Value) -> Result<(), String> {
    let mut stored = state.config.lock().unwrap();
    config::merge(&mut stored, config);
    config::save(&state.config_path, &stored)
}

// 运行应用
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 获取主窗口
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Lsky Studio").unwrap();

            // 初始化配置与上传运行时
            let path = config_path(app.handle());
            let config = config::load(&path);
            app.manage(AppState {
                config: Mutex::new(config),
                config_path: path.clone(),
                http: reqwest::Client::new(),
                upload: Arc::new(UploadRuntime::new()),
                started_at: Instant::now(),
            });

            // 后端随应用启动即就绪，保留迁移前的事件契约
            let _ = app.emit(
                "node_ready",
                json!({
                    "version": env!("CARGO_PKG_VERSION"),
                    "pid": std::process::id(),
                    "configPath": path.to_string_lossy()
                }),
            );

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            close_window,
            get_app_version,
            get_app_name,
            get_version,
            get_status,
            load_config,
            save_config,
            config::config_get,
            config::config_update,
            config::config_test_connection,
            config::config_get_strategies,
            upload::upload_start,
            upload::upload_pause,
            upload::upload_resume,
            upload::upload_cancel,
            upload::upload_status,
            upload::resolve_files,
            files::select_files,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时发生错误");
}
