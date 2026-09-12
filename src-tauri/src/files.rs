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

    let mut metas = Vec::new();
    for path in paths {
        if let Ok(path) = path.into_path() {
            if let Ok(meta) = file_meta(&path).await {
                metas.push(meta);
            }
        }
    }
    metas
}
