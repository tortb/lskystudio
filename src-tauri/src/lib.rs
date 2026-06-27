use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{Manager, Emitter};

// 应用配置结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub api_url: String,
    pub api_token: String,
    pub strategy_id: String,
    pub concurrency: u32,
    pub theme: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_url: String::new(),
            api_token: String::new(),
            strategy_id: "1".to_string(),
            concurrency: 3,
            theme: "system".to_string(),
        }
    }
}

// IPC 消息结构
#[derive(Debug, Serialize, Deserialize)]
struct IpcCommand {
    id: String,
    method: String,
    params: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct IpcResponse {
    id: String,
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<IpcError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct IpcError {
    code: String,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct IpcEvent {
    #[serde(rename = "type")]
    event_type: String,
    payload: serde_json::Value,
}

// Node 进程管理器
struct NodeProcess {
    child: Option<std::process::Child>,
    stdin: Option<std::process::ChildStdin>,
    pending_commands: Arc<Mutex<HashMap<String, tokio::sync::oneshot::Sender<IpcResponse>>>>,
}

impl NodeProcess {
    fn new() -> Self {
        Self {
            child: None,
            stdin: None,
            pending_commands: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn start(&mut self, app_handle: tauri::AppHandle) -> Result<(), String> {
        // 获取 node-ipc 目录路径
        let resource_path = app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("无法找到资源目录: {}", e))?
            .join("../node-ipc");

        // 启动 Node.js 进程
        let mut child = Command::new("node")
            .arg("index.js")
            .current_dir(&resource_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动 Node.js 进程失败: {}", e))?;

        // 获取 stdin
        let stdin = child.stdin.take().ok_or("无法获取 stdin")?;

        // 获取 stdout
        let stdout = child.stdout.take().ok_or("无法获取 stdout")?;

        // 克隆 pending_commands
        let pending_commands = self.pending_commands.clone();
        let app_handle_clone = app_handle.clone();

        // 启动 stdout 读取线程
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }

                        // 尝试解析为响应或事件
                        if let Ok(response) = serde_json::from_str::<IpcResponse>(&line) {
                            // 是响应，找到对应的 pending command
                            let mut commands = pending_commands.lock().unwrap();
                            if let Some(sender) = commands.remove(&response.id) {
                                let _ = sender.send(response);
                            }
                        } else if let Ok(event) = serde_json::from_str::<IpcEvent>(&line) {
                            // 是事件，发送到前端
                            let _ = app_handle_clone.emit(&event.event_type, &event.payload);
                        }
                    }
                    Err(e) => {
                        eprintln!("读取 stdout 失败: {}", e);
                        break;
                    }
                }
            }
        });

        // 启动 stderr 读取线程
        let stderr = child.stderr.take();
        if let Some(stderr) = stderr {
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        eprintln!("Node stderr: {}", line);
                    }
                }
            });
        }

        self.child = Some(child);
        self.stdin = Some(stdin);

        Ok(())
    }

    fn send_command(&mut self, command: IpcCommand) -> Result<(), String> {
        let stdin = self.stdin.as_mut().ok_or("stdin 不可用")?;
        let json = serde_json::to_string(&command).map_err(|e| e.to_string())?;
        writeln!(stdin, "{}", json).map_err(|e| format!("写入 stdin 失败: {}", e))?;
        stdin.flush().map_err(|e| format!("刷新 stdin 失败: {}", e))?;
        Ok(())
    }

    fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.stdin = None;
    }
}

// 全局状态
struct AppState {
    node_process: Arc<Mutex<NodeProcess>>,
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

// IPC 命令转发
#[tauri::command]
async fn ipc_call(
    state: tauri::State<'_, AppState>,
    method: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let id = format!("cmd_{}", uuid::Uuid::new_v4());

    let command = IpcCommand {
        id: id.clone(),
        method,
        params,
    };

    // 创建 oneshot channel
    let (tx, rx) = tokio::sync::oneshot::channel();

    // 注册 pending command
    {
        let process = state.node_process.lock().map_err(|e| e.to_string())?;
        let mut commands = process.pending_commands.lock().map_err(|e| e.to_string())?;
        commands.insert(id.clone(), tx);
    }

    // 发送命令
    {
        let mut process = state.node_process.lock().map_err(|e| e.to_string())?;
        process.send_command(command)?;
    }

    // 等待响应（超时 30 秒）
    match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
        Ok(Ok(response)) => {
            if response.success {
                Ok(response.data.unwrap_or(serde_json::Value::Null))
            } else {
                Err(response.error.map(|e| e.message).unwrap_or_else(|| "未知错误".to_string()))
            }
        }
        Ok(Err(_)) => Err("等待响应失败".to_string()),
        Err(_) => Err("命令超时".to_string()),
    }
}

// 配置管理命令
#[tauri::command]
async fn load_config(app_handle: tauri::AppHandle) -> Result<AppConfig, String> {
    let config_path = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法找到配置目录: {}", e))?
        .join("config.json");

    if config_path.exists() {
        let config_str = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("读取配置文件失败: {}", e))?;
        let config: AppConfig = serde_json::from_str(&config_str)
            .map_err(|e| format!("解析配置文件失败: {}", e))?;
        Ok(config)
    } else {
        Ok(AppConfig::default())
    }
}

#[tauri::command]
async fn save_config(app_handle: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法找到配置目录: {}", e))?;

    // 确保配置目录存在
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;

    let config_path = config_dir.join("config.json");
    let config_str = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    std::fs::write(&config_path, config_str)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok(())
}

// 运行应用
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 获取主窗口
            let window = app.get_webview_window("main").unwrap();

            // 设置窗口标题
            window.set_title("Lsky Studio").unwrap();

            // 创建 Node 进程管理器
            let mut node_process = NodeProcess::new();

            // 启动 Node 进程
            let app_handle = app.handle().clone();
            match node_process.start(app_handle) {
                Ok(_) => println!("Node.js 进程启动成功"),
                Err(e) => eprintln!("启动 Node.js 失败: {}", e),
            }

            // 保存到全局状态
            app.manage(AppState {
                node_process: Arc::new(Mutex::new(node_process)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            close_window,
            get_app_version,
            get_app_name,
            ipc_call,
            load_config,
            save_config,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时发生错误");
}
