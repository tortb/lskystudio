use std::path::PathBuf;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::upload::{file_meta, FileMeta};

/// 打开系统文件选择框（Tauri 下 `<input type="file">` 拿不到真实路径）
#[tauri::command]
pub async fn select_files(app: AppHandle) -> Vec<FileMeta> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("选择要上传的图片")
        .add_filter("图片", &["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"])
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });

    let paths = match rx.await {
        Ok(Some(paths)) => paths,
        _ => return Vec::new(),
    };

    let paths: Vec<PathBuf> = paths
        .into_iter()
        .filter_map(|path| path.into_path().ok())
        .collect();

    // 并发读取元信息，避免批量选择上千个文件时逐个串行 stat
    futures::future::join_all(paths.iter().map(|path| file_meta(path)))
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect()
}
