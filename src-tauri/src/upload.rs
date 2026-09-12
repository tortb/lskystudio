use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::sync::Semaphore;
use tokio_util::io::ReaderStream;

use crate::config::normalize_base_url;
use crate::error::UploadError;
use crate::AppState;

/// 前端传入的待上传文件
#[derive(Debug, Deserialize)]
pub struct UploadFile {
    pub path: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub size: Option<u64>,
}

/// 文件元信息（返回给前端，字段与 `UploadFile` 对齐）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMeta {
    pub path: String,
    pub name: String,
    pub size: u64,
}

/// 上传任务，字段与迁移前 Node 侧任务对象保持一致
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadTask {
    pub id: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: u64,
    pub status: String,
    pub progress: u32,
    pub url: Option<String>,
    pub error: Option<String>,
}

/// 一次上传会话的参数（供暂停/重试后重新入队使用）
#[derive(Debug, Clone)]
pub struct UploadSession {
    pub api_url: String,
    pub token: String,
    pub storage_id: String,
    pub retry_count: u32,
    pub retry_delay_ms: u64,
}

/// 上传成功结果
#[derive(Debug, Clone)]
pub struct UploadOk {
    pub url: String,
    pub thumbnail_url: String,
}

/// 进度回调：(已上传字节, 总字节)
pub type ProgressFn = Arc<dyn Fn(u64, u64) + Send + Sync>;

/// 上传运行时状态
pub struct UploadRuntime {
    tasks: Mutex<Vec<UploadTask>>,
    handles: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
    session: Mutex<Option<UploadSession>>,
    semaphore: Mutex<Arc<Semaphore>>,
    is_uploading: AtomicBool,
}

impl UploadRuntime {
    pub fn new() -> Self {
        Self {
            tasks: Mutex::new(Vec::new()),
            handles: Mutex::new(HashMap::new()),
            session: Mutex::new(None),
            semaphore: Mutex::new(Arc::new(Semaphore::new(3))),
            is_uploading: AtomicBool::new(false),
        }
    }

    pub fn is_uploading(&self) -> bool {
        self.is_uploading.load(Ordering::Relaxed)
    }

    pub fn task_count(&self) -> usize {
        self.tasks.lock().unwrap().len()
    }

    /// 任务快照，`ids` 为空时返回全部（保持插入顺序）
    pub fn snapshot(&self, ids: Option<&[String]>) -> Vec<UploadTask> {
        let tasks = self.tasks.lock().unwrap();
        match ids {
            Some(ids) => tasks
                .iter()
                .filter(|task| ids.contains(&task.id))
                .cloned()
                .collect(),
            None => tasks.clone(),
        }
    }

    fn ids(&self) -> Vec<String> {
        self.tasks.lock().unwrap().iter().map(|t| t.id.clone()).collect()
    }

    fn status_of(&self, id: &str) -> Option<String> {
        self.tasks
            .lock()
            .unwrap()
            .iter()
            .find(|t| t.id == id)
            .map(|t| t.status.clone())
    }

    fn update<F: FnOnce(&mut UploadTask)>(&self, id: &str, update: F) {
        let mut tasks = self.tasks.lock().unwrap();
        if let Some(task) = tasks.iter_mut().find(|t| t.id == id) {
            update(task);
        }
    }

    fn set_status(&self, id: &str, status: &str) {
        self.update(id, |task| task.status = status.to_string());
    }

    /// 中断任务对应的异步请求并释放资源
    fn abort(&self, id: &str) {
        if let Some(handle) = self.handles.lock().unwrap().remove(id) {
            handle.abort();
        }
    }

    fn has_active_tasks(&self) -> bool {
        self.tasks
            .lock()
            .unwrap()
            .iter()
            .any(|t| t.status == "pending" || t.status == "uploading")
    }
}

impl Default for UploadRuntime {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn upload_start<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    files: Vec<UploadFile>,
    api_url: String,
    token: String,
    storage_id: Option<String>,
    concurrency: Option<u32>,
) -> Result<Value, String> {
    if files.is_empty() {
        return Err("文件列表为空".to_string());
    }
    if api_url.trim().is_empty() || token.trim().is_empty() {
        return Err("API 配置不完整".to_string());
    }

    let runtime = state.upload.clone();

    // 重置上一轮任务
    for (_, handle) in runtime.handles.lock().unwrap().drain() {
        handle.abort();
    }
    runtime.tasks.lock().unwrap().clear();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);

    let tasks: Vec<UploadTask> = files
        .iter()
        .enumerate()
        .map(|(index, file)| UploadTask {
            id: format!("task_{}_{}", now, index),
            file_name: file
                .name
                .clone()
                .filter(|name| !name.is_empty())
                .unwrap_or_else(|| file_name_of(&file.path)),
            file_path: file.path.clone(),
            file_size: file.size.unwrap_or(0),
            status: "pending".to_string(),
            progress: 0,
            url: None,
            error: None,
        })
        .collect();

    let task_ids: Vec<String> = tasks.iter().map(|t| t.id.clone()).collect();
    *runtime.tasks.lock().unwrap() = tasks.clone();

    let concurrency = concurrency.unwrap_or(3).clamp(1, 20) as usize;
    *runtime.semaphore.lock().unwrap() = Arc::new(Semaphore::new(concurrency));

    let config = state.config.lock().unwrap().clone();
    let read_u64 = |key: &str, fallback: u64| {
        config.get(key).and_then(|v| v.as_u64()).unwrap_or(fallback)
    };
    *runtime.session.lock().unwrap() = Some(UploadSession {
        api_url,
        token,
        storage_id: storage_id.unwrap_or_else(|| "1".to_string()),
        retry_count: read_u64("retryCount", 3) as u32,
        retry_delay_ms: read_u64("retryDelay", 1000),
    });
    runtime.is_uploading.store(true, Ordering::Relaxed);

    let _ = app.emit("upload_tasks_created", json!({ "tasks": tasks }));

    for task_id in &task_ids {
        spawn_task(
            app.clone(),
            runtime.clone(),
            state.http.clone(),
            task_id.clone(),
        );
    }

    Ok(json!({ "taskIds": task_ids }))
}

#[tauri::command]
pub async fn upload_pause(
    state: State<'_, AppState>,
    task_ids: Option<Vec<String>>,
) -> Result<Value, String> {
    let runtime = state.upload.clone();
    let ids = task_ids.clone().unwrap_or_else(|| runtime.ids());

    for id in &ids {
        if runtime.status_of(id).as_deref() == Some("uploading") {
            runtime.abort(id);
            runtime.set_status(id, "paused");
        }
    }

    Ok(json!({ "paused": ids }))
}

#[tauri::command]
pub async fn upload_resume<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    task_ids: Option<Vec<String>>,
) -> Result<Value, String> {
    let runtime = state.upload.clone();
    let ids = task_ids.unwrap_or_else(|| runtime.ids());
    let mut resumed = Vec::new();

    // 失败任务一并重试，否则「重试失败」按钮无法生效
    for id in ids {
        if matches!(runtime.status_of(&id).as_deref(), Some("paused") | Some("failed")) {
            runtime.update(&id, |task| {
                task.status = "pending".to_string();
                task.error = None;
                task.progress = 0;
            });
            resumed.push(id);
        }
    }

    if !resumed.is_empty() {
        runtime.is_uploading.store(true, Ordering::Relaxed);
        for task_id in &resumed {
            spawn_task(
                app.clone(),
                runtime.clone(),
                state.http.clone(),
                task_id.clone(),
            );
        }
    }

    Ok(json!({ "resumed": resumed }))
}

#[tauri::command]
pub async fn upload_cancel(
    state: State<'_, AppState>,
    task_ids: Option<Vec<String>>,
) -> Result<Value, String> {
    let runtime = state.upload.clone();
    let cancel_all = task_ids.is_none();
    let ids = task_ids.unwrap_or_else(|| runtime.ids());
    let mut cancelled = Vec::new();

    for id in ids {
        if matches!(
            runtime.status_of(&id).as_deref(),
            Some("uploading") | Some("pending") | Some("paused")
        ) {
            runtime.abort(&id);
            runtime.set_status(&id, "cancelled");
            cancelled.push(id);
        }
    }

    if cancel_all {
        runtime.is_uploading.store(false, Ordering::Relaxed);
    }

    Ok(json!({ "cancelled": cancelled }))
}

#[tauri::command]
pub async fn upload_status(
    state: State<'_, AppState>,
    task_ids: Option<Vec<String>>,
) -> Result<Value, String> {
    Ok(json!({ "tasks": state.upload.snapshot(task_ids.as_deref()) }))
}

/// 把拖拽得到的路径解析为文件元信息
#[tauri::command]
pub async fn resolve_files(paths: Vec<String>) -> Vec<FileMeta> {
    let mut metas = Vec::new();
    for path in paths {
        if let Ok(meta) = file_meta(Path::new(&path)).await {
            metas.push(meta);
        }
    }
    metas
}

/// 读取单个文件的元信息（目录会被拒绝）
pub async fn file_meta(path: &Path) -> std::io::Result<FileMeta> {
    let metadata = tokio::fs::metadata(path).await?;
    if !metadata.is_file() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "不是文件",
        ));
    }
    Ok(FileMeta {
        path: path.to_string_lossy().to_string(),
        name: file_name_of(&path.to_string_lossy()),
        size: metadata.len(),
    })
}

fn file_name_of(path: &str) -> String {
    Path::new(path)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string())
}

fn spawn_task<R: Runtime>(
    app: AppHandle<R>,
    runtime: Arc<UploadRuntime>,
    client: reqwest::Client,
    task_id: String,
) {
    let task = runtime.clone();
    let id = task_id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        let session = task.session.lock().unwrap().clone();
        let Some(session) = session else {
            return;
        };

        let semaphore = task.semaphore.lock().unwrap().clone();
        let Ok(_permit) = semaphore.acquire_owned().await else {
            return;
        };

        // 排队期间可能已被暂停/取消
        if task.status_of(&id).as_deref() != Some("pending") {
            task.handles.lock().unwrap().remove(&id);
            return;
        }

        run_upload(&app, &task, &client, &id, &session).await;
        task.handles.lock().unwrap().remove(&id);

        if !task.has_active_tasks() {
            task.is_uploading.store(false, Ordering::Relaxed);
        }
    });

    runtime.handles.lock().unwrap().insert(task_id, handle);
}

async fn run_upload<R: Runtime>(
    app: &AppHandle<R>,
    runtime: &Arc<UploadRuntime>,
    client: &reqwest::Client,
    task_id: &str,
    session: &UploadSession,
) {
    let (file_path, file_name) = {
        let tasks = runtime.tasks.lock().unwrap();
        match tasks.iter().find(|t| t.id == task_id) {
            Some(task) => (task.file_path.clone(), task.file_name.clone()),
            None => return,
        }
    };

    runtime.update(task_id, |task| {
        task.status = "uploading".to_string();
        task.progress = 0;
    });
    let _ = app.emit(
        "upload_progress",
        json!({
            "taskId": task_id,
            "fileName": file_name,
            "progress": 0,
            "status": "uploading"
        }),
    );

    let progress = make_progress_fn(app, runtime, task_id, &file_name);
    let file_path = Arc::new(PathBuf::from(file_path));

    let result = with_retry(session.retry_count, session.retry_delay_ms, || {
        attempt_upload(
            client.clone(),
            file_path.clone(),
            session.clone(),
            progress.clone(),
        )
    })
    .await;

    match result {
        Ok(ok) => {
            runtime.update(task_id, |task| {
                task.status = "success".to_string();
                task.progress = 100;
                task.url = Some(ok.url.clone());
            });
            let _ = app.emit(
                "upload_complete",
                json!({
                    "taskId": task_id,
                    "fileName": file_name,
                    "url": ok.url,
                    "thumbnailUrl": ok.thumbnail_url
                }),
            );
        }
        Err(err) => {
            let message = err.to_string();
            runtime.update(task_id, |task| {
                task.status = "failed".to_string();
                task.error = Some(message.clone());
            });
            let _ = app.emit(
                "upload_error",
                json!({
                    "taskId": task_id,
                    "fileName": file_name,
                    "errorCode": "UPLOAD_FAILED",
                    "errorMessage": message,
                    "retryable": err.retryable()
                }),
            );
        }
    }
}

/// 构造进度回调：更新任务进度并按百分比变化推送事件，避免事件风暴
fn make_progress_fn<R: Runtime>(
    app: &AppHandle<R>,
    runtime: &Arc<UploadRuntime>,
    task_id: &str,
    file_name: &str,
) -> ProgressFn {
    let app = app.clone();
    let runtime = runtime.clone();
    let task_id = task_id.to_string();
    let file_name = file_name.to_string();
    let last_percent = Arc::new(AtomicU64::new(u64::MAX));

    Arc::new(move |uploaded: u64, total: u64| {
        let percent = if total > 0 {
            (uploaded * 100 / total).min(100)
        } else {
            0
        };
        if last_percent.swap(percent, Ordering::Relaxed) == percent {
            return;
        }
        runtime.update(&task_id, |task| task.progress = percent as u32);
        let _ = app.emit(
            "upload_progress",
            json!({
                "taskId": task_id,
                "fileName": file_name,
                "progress": percent,
                "uploadedBytes": uploaded,
                "totalBytes": total,
                "status": "uploading"
            }),
        );
    })
}

/// 指数退避重试：仅网络异常与服务端 5xx 会重试
pub async fn with_retry<F, Fut, T>(
    retry_count: u32,
    retry_delay_ms: u64,
    mut operation: F,
) -> Result<T, UploadError>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, UploadError>>,
{
    let mut attempt = 0u32;
    loop {
        attempt += 1;
        match operation().await {
            Ok(value) => return Ok(value),
            Err(err) if err.retryable() && attempt <= retry_count => {
                let backoff = retry_delay_ms.saturating_mul(1u64 << (attempt - 1).min(16));
                tokio::time::sleep(Duration::from_millis(backoff)).await;
            }
            Err(err) => return Err(err),
        }
    }
}

/// 单次上传：流式读取文件并发送 multipart 请求
pub async fn attempt_upload(
    client: reqwest::Client,
    file_path: Arc<PathBuf>,
    session: UploadSession,
    on_progress: ProgressFn,
) -> Result<UploadOk, UploadError> {
    let file = match tokio::fs::File::open(file_path.as_ref()).await {
        Ok(file) => file,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Err(UploadError::NotFound),
        Err(err) => return Err(UploadError::Io(err)),
    };

    let total = file.metadata().await.map(|meta| meta.len()).unwrap_or(0);
    let file_name = file_name_of(&file_path.to_string_lossy());
    let url = format!(
        "{}/api/v2/upload",
        normalize_base_url(&session.api_url)
    );

    // 边读边上报进度，避免把大文件整体读入内存
    let uploaded = Arc::new(AtomicU64::new(0));
    let stream = ReaderStream::with_capacity(file, 64 * 1024).map(move |chunk| {
        if let Ok(bytes) = &chunk {
            let current = uploaded.fetch_add(bytes.len() as u64, Ordering::Relaxed) + bytes.len() as u64;
            on_progress(current, total);
        }
        chunk
    });

    let part = reqwest::multipart::Part::stream_with_length(reqwest::Body::wrap_stream(stream), total)
        .file_name(file_name.clone())
        .mime_str(mime_for(&file_name))
        .map_err(|err| UploadError::Api(err.to_string()))?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("storage_id", session.storage_id.clone());

    let response = client
        .post(&url)
        .bearer_auth(&session.token)
        .multipart(form)
        .send()
        .await?;

    let status = response.status();
    let text = response.text().await?;
    // 网关/代理在 5xx 时通常返回 HTML 错误页，若先按 JSON 解析，真实状态码会被
    // 吞成一句「解析响应失败」，且不再具备重试资格（5xx 本应重试）。
    // 因此先按状态码分支，只有 2xx 才要求响应体是 JSON。
    let parsed: Option<Value> = serde_json::from_str(&text).ok();

    if !status.is_success() {
        let message = parsed
            .as_ref()
            .and_then(|body| body.get("message"))
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| response_snippet(&text));
        return Err(UploadError::Http {
            status: status.as_u16(),
            message,
        });
    }

    let body = parsed.ok_or_else(|| {
        UploadError::Parse(format!(
            "HTTP {} 返回了非 JSON 响应: {}",
            status.as_u16(),
            response_snippet(&text)
        ))
    })?;

    if !is_upload_success(&body) {
        return Err(UploadError::Api(
            body.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("上传失败")
                .to_string(),
        ));
    }

    let data = body.get("data");
    let pick = |value: Option<&Value>| -> Option<String> {
        value.and_then(|v| v.as_str()).map(|s| s.to_string())
    };

    Ok(UploadOk {
        url: pick(data.and_then(|d| d.get("public_url")))
            .or_else(|| pick(data.and_then(|d| d.get("links")).and_then(|l| l.get("url"))))
            .or_else(|| pick(body.get("url")))
            .unwrap_or_default(),
        thumbnail_url: pick(data.and_then(|d| d.get("thumbnail_url")))
            .or_else(|| {
                pick(data
                    .and_then(|d| d.get("links"))
                    .and_then(|l| l.get("thumbnail")))
            })
            .or_else(|| pick(body.get("thumbnailUrl")))
            .unwrap_or_default(),
    })
}

/// 兰空图床响应中 status 可能为 `true`、`"success"` 或 `200`
fn is_upload_success(body: &Value) -> bool {
    match body.get("status") {
        Some(Value::Bool(true)) => true,
        Some(Value::String(status)) => status == "success",
        Some(Value::Number(number)) => number.as_i64() == Some(200),
        _ => false,
    }
}

/// 响应体不是 JSON 时截取正文片段，便于定位网关返回的 HTML 错误页
fn response_snippet(text: &str) -> String {
    let compact = text.split_whitespace().collect::<Vec<_>>().join(" ");
    let snippet: String = compact.chars().take(200).collect();
    if snippet.is_empty() {
        "响应为空".to_string()
    } else {
        snippet
    }
}

/// 与迁移前 Node 侧 getMimeType 保持一致的映射
pub fn mime_for(file_name: &str) -> &'static str {
    let extension = Path::new(file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase());
    match extension.as_deref() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicU32;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    fn temp_file_path(tag: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("lsky-test-{}-{}-{}", tag, std::process::id(), nanos))
    }

    fn session(api_url: String) -> UploadSession {
        UploadSession {
            api_url,
            token: "test-token".to_string(),
            storage_id: "1".to_string(),
            retry_count: 3,
            retry_delay_ms: 0,
        }
    }

    /// 起一个本地 HTTP 服务，读取完整请求后返回固定响应，返回其 base url
    async fn spawn_server(status_line: &'static str, body: &'static str) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut buf = Vec::new();
            let mut chunk = [0u8; 8192];
            let (body_start, content_length) = loop {
                let read = socket.read(&mut chunk).await.unwrap();
                if read == 0 {
                    break (buf.len(), 0);
                }
                buf.extend_from_slice(&chunk[..read]);
                if let Some(pos) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&buf[..pos]).to_ascii_lowercase();
                    let length = headers
                        .lines()
                        .find_map(|line| line.strip_prefix("content-length:"))
                        .and_then(|value| value.trim().parse::<usize>().ok())
                        .unwrap_or(0);
                    break (pos + 4, length);
                }
            };
            // 等待请求体收完，避免客户端写入时连接被提前关闭
            while buf.len() < body_start + content_length {
                let read = socket.read(&mut chunk).await.unwrap();
                if read == 0 {
                    break;
                }
                buf.extend_from_slice(&chunk[..read]);
            }
            let response = format!(
                "{status_line}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            socket.write_all(response.as_bytes()).await.unwrap();
            socket.flush().await.unwrap();
        });
        format!("http://{addr}")
    }

    #[tokio::test]
    async fn upload_success_returns_url() {
        // 场景一：正常上传成功
        let api_url = spawn_server(
            "HTTP/1.1 200 OK",
            r#"{"status":true,"data":{"public_url":"https://img.example/a.png","thumbnail_url":"https://img.example/a_thumb.png"}}"#,
        )
        .await;

        let path = temp_file_path("ok.png");
        tokio::fs::write(&path, b"fake-image-bytes").await.unwrap();

        let chunks = Arc::new(AtomicU32::new(0));
        let counter = chunks.clone();
        let progress: ProgressFn = Arc::new(move |_, _| {
            counter.fetch_add(1, Ordering::Relaxed);
        });

        let result = attempt_upload(
            reqwest::Client::new(),
            Arc::new(path.clone()),
            session(api_url),
            progress,
        )
        .await;

        tokio::fs::remove_file(&path).await.ok();
        let ok = result.expect("上传应当成功");
        assert_eq!(ok.url, "https://img.example/a.png");
        assert_eq!(ok.thumbnail_url, "https://img.example/a_thumb.png");
        assert!(chunks.load(Ordering::Relaxed) > 0, "应当上报过进度");
    }

    #[tokio::test]
    async fn upload_retries_on_network_failure() {
        // 场景二：网络失败后重试直至成功
        let attempts = Arc::new(AtomicU32::new(0));
        let counter = attempts.clone();
        let result: Result<u32, UploadError> = with_retry(3, 0, move || {
            let counter = counter.clone();
            async move {
                let attempt = counter.fetch_add(1, Ordering::Relaxed) + 1;
                if attempt < 3 {
                    Err(UploadError::Network("连接被重置".to_string()))
                } else {
                    Ok(attempt)
                }
            }
        })
        .await;

        assert_eq!(result.unwrap(), 3);
        assert_eq!(attempts.load(Ordering::Relaxed), 3);

        // 不可重试的错误立即返回，不消耗重试次数
        let calls = Arc::new(AtomicU32::new(0));
        let counter = calls.clone();
        let result: Result<u32, UploadError> = with_retry(3, 0, move || {
            let counter = counter.clone();
            async move {
                counter.fetch_add(1, Ordering::Relaxed);
                Err(UploadError::Api("参数错误".to_string()))
            }
        })
        .await;
        assert!(matches!(result, Err(UploadError::Api(_))));
        assert_eq!(calls.load(Ordering::Relaxed), 1);
    }

    /// 大文件按块流式读取：进度回调多次触发且字节单调递增，而非一次性读入
    #[tokio::test]
    async fn upload_streams_large_file_in_chunks() {
        let api_url = spawn_server(
            "HTTP/1.1 200 OK",
            r#"{"status":true,"data":{"public_url":"https://img.example/big.bin"}}"#,
        )
        .await;

        let path = temp_file_path("big.bin");
        let size = 16 * 1024 * 1024usize;
        tokio::fs::write(&path, vec![7u8; size]).await.unwrap();

        let samples = Arc::new(Mutex::new(Vec::new()));
        let sink = samples.clone();
        let progress: ProgressFn = Arc::new(move |uploaded, total| {
            sink.lock().unwrap().push((uploaded, total));
        });

        let ok = attempt_upload(
            reqwest::Client::new(),
            Arc::new(path.clone()),
            session(api_url),
            progress,
        )
        .await
        .expect("大文件上传应当成功");
        tokio::fs::remove_file(&path).await.ok();

        assert_eq!(ok.url, "https://img.example/big.bin");
        let samples = samples.lock().unwrap();
        assert!(
            samples.len() >= 16,
            "应按 64KB 分块上报进度，实际仅 {} 次",
            samples.len()
        );
        assert!(
            samples.windows(2).all(|pair| pair[1].0 > pair[0].0),
            "已上传字节应单调递增"
        );
        assert!(samples.iter().all(|(_, total)| *total as usize == size));
        assert_eq!(samples.last().unwrap().0 as usize, size, "应上传完整文件");
    }

    #[tokio::test]
    async fn upload_missing_file_returns_not_found() {
        // 场景三：文件不存在
        let path = temp_file_path("missing.png");
        let progress: ProgressFn = Arc::new(|_, _| {});
        let result = attempt_upload(
            reqwest::Client::new(),
            Arc::new(path),
            session("http://127.0.0.1:1".to_string()),
            progress,
        )
        .await;

        match result {
            Err(UploadError::NotFound) => {}
            other => panic!("期望 NotFound，实际为 {other:?}"),
        }
        assert!(!UploadError::NotFound.retryable());
    }

    /// 网关 5xx 返回 HTML 错误页：必须保留状态码（可重试），而不是报「解析响应失败」
    #[tokio::test]
    async fn gateway_html_error_keeps_status_and_stays_retryable() {
        let api_url = spawn_server(
            "HTTP/1.1 502 Bad Gateway",
            "<html>\n  <head><title>502 Bad Gateway</title></head>\n</html>",
        )
        .await;

        let path = temp_file_path("gateway.png");
        tokio::fs::write(&path, b"fake-image-bytes").await.unwrap();

        let result = attempt_upload(
            reqwest::Client::new(),
            Arc::new(path.clone()),
            session(api_url),
            Arc::new(|_, _| {}),
        )
        .await;
        tokio::fs::remove_file(&path).await.ok();

        match result {
            Err(err @ UploadError::Http { status: 502, .. }) => {
                assert!(err.retryable(), "5xx 应当可重试");
                assert!(
                    err.to_string().contains("502 Bad Gateway"),
                    "错误信息应带上响应片段，实际为 {err}"
                );
            }
            other => panic!("期望 Http 502，实际为 {other:?}"),
        }
    }

    /// 2xx 却返回非 JSON：报解析错误并带上状态码与响应片段，便于定位
    #[tokio::test]
    async fn non_json_success_response_reports_snippet() {
        let api_url = spawn_server("HTTP/1.1 200 OK", "not-json").await;

        let path = temp_file_path("nonjson.png");
        tokio::fs::write(&path, b"fake-image-bytes").await.unwrap();

        let result = attempt_upload(
            reqwest::Client::new(),
            Arc::new(path.clone()),
            session(api_url),
            Arc::new(|_, _| {}),
        )
        .await;
        tokio::fs::remove_file(&path).await.ok();

        let message = result.unwrap_err().to_string();
        assert!(message.contains("HTTP 200"), "实际为 {message}");
        assert!(message.contains("not-json"), "实际为 {message}");
    }

    #[test]
    fn mime_and_success_helpers() {
        assert_eq!(mime_for("a.PNG"), "image/png");
        assert_eq!(mime_for("a.jpeg"), "image/jpeg");
        assert_eq!(mime_for("a.unknown"), "application/octet-stream");
        assert_eq!(mime_for("noext"), "application/octet-stream");

        assert!(is_upload_success(&json!({ "status": true })));
        assert!(is_upload_success(&json!({ "status": "success" })));
        assert!(is_upload_success(&json!({ "status": 200 })));
        assert!(!is_upload_success(&json!({ "status": false })));
        assert!(!is_upload_success(&json!({ "status": 500 })));
        assert!(!is_upload_success(&json!({})));
    }

    #[tokio::test]
    async fn file_meta_rejects_directory() {
        let dir = std::env::temp_dir();
        let err = file_meta(&dir).await.unwrap_err();
        assert_eq!(err.kind(), std::io::ErrorKind::InvalidInput);
    }
}

/// 队列/并发行为验证（对应迁移 Spec 4.3 的重点验证场景）
#[cfg(test)]
mod queue_tests {
    use super::*;
    use std::sync::atomic::AtomicU32;
    use std::time::Instant;
    use tauri::Manager;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    /// 起一个记录并发峰值、每个请求延迟 `delay_ms` 返回成功的上传服务
    async fn spawn_tracking_server(delay_ms: u64) -> (String, Arc<AtomicU32>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let active = Arc::new(AtomicU32::new(0));
        let peak = Arc::new(AtomicU32::new(0));
        let active_srv = active.clone();
        let peak_srv = peak.clone();
        tokio::spawn(async move {
            loop {
                let Ok((mut socket, _)) = listener.accept().await else {
                    break;
                };
                let active = active_srv.clone();
                let peak = peak_srv.clone();
                tokio::spawn(async move {
                    let current = active.fetch_add(1, Ordering::SeqCst) + 1;
                    peak.fetch_max(current, Ordering::SeqCst);
                    let mut buf = [0u8; 8192];
                    let _ = socket.read(&mut buf).await;
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    let body = r#"{"status":true,"data":{"public_url":"https://img.example/x.png","thumbnail_url":"https://img.example/x_thumb.png"}}"#;
                    let response = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        body.len(),
                        body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    let _ = socket.flush().await;
                    active.fetch_sub(1, Ordering::SeqCst);
                });
            }
        });
        (format!("http://{addr}"), peak)
    }

    fn temp_path(tag: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("lsky-queue-{}-{}-{}", tag, std::process::id(), nanos))
    }

    /// 构造带 `AppState` 的 Tauri mock 应用
    fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_builder()
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap();
        app.manage(AppState {
            config: Mutex::new(crate::config::default_config()),
            config_path: temp_path("config.json"),
            http: reqwest::Client::new(),
            upload: Arc::new(UploadRuntime::new()),
            started_at: Instant::now(),
        });
        app
    }

    /// 并发数受控、单文件失败不影响其他文件、任务状态与事件契约正确
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn queue_respects_concurrency_and_isolates_failures() {
        let (api_url, peak) = spawn_tracking_server(100).await;
        let app = mock_app();

        // 5 个存在的文件 + 1 个不存在的文件
        let mut files = Vec::new();
        let mut created = Vec::new();
        for index in 0..5 {
            let path = temp_path(&format!("ok{index}.png"));
            tokio::fs::write(&path, b"payload").await.unwrap();
            created.push(path.clone());
            files.push(UploadFile {
                path: path.to_string_lossy().to_string(),
                name: None,
                size: None,
            });
        }
        files.push(UploadFile {
            path: temp_path("missing.png").to_string_lossy().to_string(),
            name: None,
            size: None,
        });

        let result = upload_start(
            app.handle().clone(),
            app.state::<AppState>(),
            files,
            api_url,
            "token".to_string(),
            None,
            Some(2),
        )
        .await
        .unwrap();
        assert_eq!(result["taskIds"].as_array().unwrap().len(), 6);

        let runtime = app.state::<AppState>().upload.clone();
        for _ in 0..200 {
            let tasks = runtime.snapshot(None);
            let finished = tasks.iter().all(|task| {
                matches!(task.status.as_str(), "success" | "failed" | "cancelled")
            });
            if finished {
                break;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }

        for path in &created {
            tokio::fs::remove_file(path).await.ok();
        }

        let tasks = runtime.snapshot(None);
        let success = tasks.iter().filter(|task| task.status == "success").count();
        let failed: Vec<&UploadTask> = tasks.iter().filter(|task| task.status == "failed").collect();
        let urls: Vec<&str> = tasks.iter().filter_map(|t| t.url.as_deref()).collect();

        assert_eq!(success, 5, "其余文件应上传成功，实际任务：{tasks:?}");
        assert_eq!(failed.len(), 1, "仅缺失文件应失败，实际任务：{tasks:?}");
        assert!(failed[0]
            .error
            .as_deref()
            .unwrap_or("")
            .contains("文件不存在"));
        assert_eq!(urls.len(), 5);
        assert!(tasks.iter().all(|task| task.progress == 100 || task.status == "failed"));

        // 并发数控制生效：峰值不超过 2，且确实达到 2（说明是并发而非串行）
        assert_eq!(peak.load(Ordering::SeqCst), 2, "并发峰值应为 2");
        assert!(!runtime.is_uploading(), "队列结束后 isUploading 应为 false");
    }

    /// 上传过程中取消应中断在途请求、标记 cancelled 并复位 isUploading
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn cancel_aborts_inflight_uploads() {
        let (api_url, peak) = spawn_tracking_server(5000).await;
        let app = mock_app();

        let mut files = Vec::new();
        let mut created = Vec::new();
        for index in 0..2 {
            let path = temp_path(&format!("cancel{index}.png"));
            tokio::fs::write(&path, b"payload").await.unwrap();
            created.push(path.clone());
            files.push(UploadFile {
                path: path.to_string_lossy().to_string(),
                name: None,
                size: None,
            });
        }

        upload_start(
            app.handle().clone(),
            app.state::<AppState>(),
            files,
            api_url,
            "token".to_string(),
            None,
            Some(2),
        )
        .await
        .unwrap();

        let runtime = app.state::<AppState>().upload.clone();
        for _ in 0..100 {
            if runtime
                .snapshot(None)
                .iter()
                .any(|task| task.status == "uploading")
            {
                break;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        assert_eq!(peak.load(Ordering::SeqCst), 2, "取消前应已有 2 个在途请求");

        let cancelled = upload_cancel(app.state::<AppState>(), None).await.unwrap();
        assert_eq!(cancelled["cancelled"].as_array().unwrap().len(), 2);

        let tasks = runtime.snapshot(None);
        assert!(tasks.iter().all(|task| task.status == "cancelled"), "{tasks:?}");
        assert!(!runtime.is_uploading(), "取消后 isUploading 应为 false");
        assert!(runtime.handles.lock().unwrap().is_empty(), "取消后应清理任务句柄");

        // 被中断的任务不应再推进状态
        tokio::time::sleep(Duration::from_millis(300)).await;
        assert!(runtime
            .snapshot(None)
            .iter()
            .all(|task| task.status == "cancelled"));

        for path in &created {
            tokio::fs::remove_file(path).await.ok();
        }
    }
}
