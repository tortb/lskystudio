use std::path::Path;

use serde_json::{json, Value};
use tauri::State;

use crate::AppState;

/// 默认配置（字段与迁移前 Node 侧 config-manager.js 保持一致）
pub fn default_config() -> Value {
    json!({
        "apiUrl": "",
        "apiToken": "",
        "strategyId": "1",
        "concurrency": 3,
        "retryCount": 3,
        "retryDelay": 1000,
        "proxyEnabled": false,
        "proxyUrl": "",
        "theme": "system",
        "language": "zh-CN",
        "autoCopyUrl": true,
        "compressEnabled": false,
        "compressQuality": 80
    })
}

/// 归一化 API 根地址：去掉末尾斜杠与 `/api/v2` 后缀
pub fn normalize_base_url(api_url: &str) -> String {
    let mut base = api_url.trim().to_string();
    if let Some(stripped) = base.strip_suffix('/') {
        base = stripped.to_string();
    }
    if let Some(stripped) = base.strip_suffix("/api/v2") {
        base = stripped.to_string();
    }
    base
}

/// 将补丁合并进配置对象（等价于 JS 的 `{ ...config, ...updates }`）
pub fn merge(base: &mut Value, patch: Value) {
    if let (Value::Object(base_map), Value::Object(patch_map)) = (&mut *base, patch) {
        for (key, value) in patch_map {
            base_map.insert(key, value);
        }
    }
}

/// 从磁盘加载配置，缺失字段用默认值补齐
pub fn load(path: &Path) -> Value {
    let mut config = default_config();
    if let Ok(text) = std::fs::read_to_string(path) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
            merge(&mut config, parsed);
        }
    }
    config
}

/// 写入配置到磁盘
pub fn save(path: &Path, config: &Value) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    let text = serde_json::to_string_pretty(config).map_err(|e| format!("序列化配置失败: {}", e))?;
    std::fs::write(path, text).map_err(|e| format!("写入配置文件失败: {}", e))
}

/// 更新内存中的配置并落盘
pub fn apply_update(state: &AppState, updates: Option<Value>) -> Result<Value, String> {
    let mut config = state.config.lock().unwrap();
    if let Some(updates) = updates {
        if let Some(concurrency) = updates.get("concurrency").and_then(|v| v.as_f64()) {
            if !(1.0..=20.0).contains(&concurrency) {
                return Err("并发数必须在 1-20 之间".to_string());
            }
        }
        merge(&mut config, updates);
    }
    save(&state.config_path, &config)?;
    Ok(config.clone())
}

#[tauri::command]
pub fn config_get(state: State<'_, AppState>) -> Value {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
pub async fn config_update(
    state: State<'_, AppState>,
    updates: Option<Value>,
) -> Result<Value, String> {
    let config = apply_update(&state, updates)?;
    Ok(json!({ "success": true, "config": config }))
}

/// 测试与兰空图床的连接。与迁移前一致：失败不抛异常，返回 `{ success: false, error }`
#[tauri::command]
pub async fn config_test_connection(
    state: State<'_, AppState>,
    api_url: String,
    api_token: String,
) -> Result<Value, String> {
    if api_url.trim().is_empty() || api_token.trim().is_empty() {
        return Err("API URL 和 Token 不能为空".to_string());
    }

    let url = format!("{}/api/v1/strategies", normalize_base_url(&api_url));
    let response = state
        .http
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_token))
        .header("Accept", "application/json")
        .send()
        .await;

    let response = match response {
        Ok(response) => response,
        Err(err) => return Ok(json!({ "success": false, "error": err.to_string() })),
    };

    if !response.status().is_success() {
        return Ok(json!({
            "success": false,
            "error": format!("HTTP {}", response.status().as_u16())
        }));
    }

    let data = match response.json::<Value>().await {
        Ok(data) => data,
        Err(err) => return Ok(json!({ "success": false, "error": format!("解析响应失败: {}", err) })),
    };

    if !is_success(&data) {
        let message = data
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("连接失败");
        return Ok(json!({ "success": false, "error": message }));
    }

    let payload = data.get("data");
    Ok(json!({
        "success": true,
        "version": payload
            .and_then(|d| d.get("version").or_else(|| d.get("api_version")))
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        "strategies": payload
            .and_then(|d| d.get("strategies"))
            .cloned()
            .unwrap_or_else(|| json!([]))
    }))
}

/// 获取存储策略列表。与迁移前一致：任何失败都返回空列表
#[tauri::command]
pub async fn config_get_strategies(
    state: State<'_, AppState>,
    api_url: Option<String>,
    api_token: Option<String>,
) -> Result<Value, String> {
    let (api_url, api_token) = match (api_url, api_token) {
        (Some(url), Some(token)) if !url.is_empty() && !token.is_empty() => (url, token),
        _ => {
            let config = state.config.lock().unwrap();
            let read = |key: &str| config.get(key).and_then(|v| v.as_str()).unwrap_or("").to_string();
            (read("apiUrl"), read("apiToken"))
        }
    };

    if api_url.is_empty() || api_token.is_empty() {
        return Ok(json!({ "strategies": [] }));
    }

    let url = format!("{}/api/v1/strategies", normalize_base_url(&api_url));
    let response = state
        .http
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_token))
        .header("Accept", "application/json")
        .send()
        .await;

    let data = match response {
        Ok(response) if response.status().is_success() => match response.json::<Value>().await {
            Ok(data) => data,
            Err(_) => return Ok(json!({ "strategies": [] })),
        },
        _ => return Ok(json!({ "strategies": [] })),
    };

    let list = data
        .get("data")
        .and_then(|d| d.get("strategies").or_else(|| d.get("data")))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if !is_success(&data) || list.is_empty() {
        return Ok(json!({ "strategies": [] }));
    }

    let strategies: Vec<Value> = list
        .iter()
        .map(|item| {
            json!({
                "id": item.get("id").map(stringify_id).unwrap_or_default(),
                "name": item.get("name").cloned().unwrap_or(Value::Null),
                "provider": item.get("provider").cloned().unwrap_or_else(|| json!("unknown")),
                "description": item.get("intro").cloned().unwrap_or_else(|| json!(""))
            })
        })
        .collect();

    Ok(json!({ "strategies": strategies }))
}

/// 兰空图床响应中 status 可能为 `true` 或 `"success"`
fn is_success(data: &Value) -> bool {
    match data.get("status") {
        Some(Value::Bool(true)) => true,
        Some(Value::String(status)) => status == "success",
        _ => false,
    }
}

/// 策略 id 统一按字符串返回，避免前端 `Strategy.id: string` 类型不匹配
fn stringify_id(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}
