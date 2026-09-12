use thiserror::Error;

/// 上传相关错误
#[derive(Debug, Error)]
pub enum UploadError {
    #[error("文件不存在")]
    NotFound,
    #[error("读取文件失败: {0}")]
    Io(#[from] std::io::Error),
    #[error("网络错误: {0}")]
    Network(String),
    #[error("HTTP {status}: {message}")]
    Http { status: u16, message: String },
    #[error("解析响应失败: {0}")]
    Parse(String),
    #[error("{0}")]
    Api(String),
}

impl UploadError {
    /// 是否可重试（网络异常或服务端 5xx）
    pub fn retryable(&self) -> bool {
        match self {
            UploadError::Network(_) => true,
            UploadError::Http { status, .. } => *status >= 500,
            _ => false,
        }
    }
}

impl From<reqwest::Error> for UploadError {
    fn from(err: reqwest::Error) -> Self {
        match err.status() {
            Some(status) => UploadError::Http {
                status: status.as_u16(),
                message: err.to_string(),
            },
            None => UploadError::Network(err.to_string()),
        }
    }
}
