// ---------------------------------------------------------------------------
// App constants
// ---------------------------------------------------------------------------

export const APP_NAME = "Lsky Studio";
export const APP_VERSION = "0.1.0";
export const APP_DESCRIPTION = "Lsky Pro 图床批量上传客户端";

// ---------------------------------------------------------------------------
// API endpoints (relative to the configured apiUrl)
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
  /** Lsky Pro API base path. */
  base: "/api/v2",

  /** Upload a single image. */
  upload: "/api/v2/upload",

  /** List photos with pagination. */
  photos: "/api/v2/user/photos",

  /** Photo detail / update by ID. */
  photoById: (id: string) => `/api/v2/user/photos/${id}`,

  /** Batch update photos. */
  photosUpdate: "/api/v2/user/photos/update",

  /** Add/remove tags on a photo. */
  photoTags: (id: string) => `/api/v2/user/photos/${id}/tags`,

  /** List available storage strategies. (保留旧版，新API未提及) */
  strategies: "/api/v1/strategies",

  /** List albums. */
  albums: "/api/v2/user/albums",

  /** Album detail / update by ID. */
  albumById: (id: string) => `/api/v2/user/albums/${id}`,

  /** Add/remove photos in an album. */
  albumPhotos: (id: string) => `/api/v2/user/albums/${id}/photos`,

  /** Add/remove tags on an album. */
  albumTags: (id: string) => `/api/v2/user/albums/${id}/tags`,

  /** Current user profile. */
  user: "/api/v2/user",

  /** User tokens. */
  tokens: "/api/v2/user/tokens",

  /** Delete token by ID. */
  tokenById: (id: string) => `/api/v2/user/tokens/${id}`,

  /** User settings. */
  setting: "/api/v2/user/setting",
} as const;

// ---------------------------------------------------------------------------
// Default configuration values
// ---------------------------------------------------------------------------

export const DEFAULTS = {
  /** Default API URL (self-hosted Lsky Pro instance). */
  apiUrl: "http://localhost:8080",

  /** Default upload concurrency. */
  concurrency: 3,

  /** Default storage strategy ID (empty = server default). */
  strategyId: "",

  /** Theme: light | dark | system. */
  theme: "system" as const,

  /** Maximum single file size in bytes (50 MB). */
  maxFileSize: 50 * 1024 * 1024,

  /** Accepted MIME types for image upload. */
  acceptedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
    "image/tiff",
  ],

  /** Accepted file extensions (for the file picker). */
  acceptedExtensions: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
    ".tiff",
    ".tif",
  ],

  /** Polling interval in ms for refreshing system status. */
  statusPollInterval: 5000,

  /** How many recent uploads to show on the dashboard. */
  recentUploadsLimit: 20,
} as const;

// ---------------------------------------------------------------------------
// Upload defaults
// ---------------------------------------------------------------------------

export const UPLOAD_DEFAULTS = {
  /** Default concurrency for web-mode uploads. */
  concurrency: 3,

  /** Maximum allowed concurrency. */
  maxConcurrency: 20,

  /** Max retry attempts per file. */
  maxRetries: 3,

  /** Max files allowed in a single upload batch. */
  maxFiles: 20000,

  /** localStorage key for upload checkpoint. */
  checkpointKey: "lsky_upload_checkpoint",
} as const;

// ---------------------------------------------------------------------------
// Error messages (Chinese, matching the rest of the UI)
// ---------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  // Connection / server
  connectionFailed: "无法连接到服务器，请检查 API 地址和网络设置",
  connectionTimeout: "连接超时，请稍后重试",
  serverError: "服务器内部错误，请稍后重试",
  unauthorized: "认证失败，请检查 API Token 是否正确",
  forbidden: "没有权限执行此操作",
  notFound: "请求的资源不存在",

  // Upload
  uploadFailed: "上传失败",
  uploadCancelled: "上传已取消",
  fileTooLarge: (maxMb: number) => `文件大小超过限制（最大 ${maxMb} MB）`,
  invalidFileType: "不支持的文件类型",
  noFilesSelected: "请先选择要上传的文件",
  noStrategySelected: "请先选择存储策略",

  // Config
  configLoadFailed: "加载配置失败",
  configSaveFailed: "保存配置失败",
  invalidApiUrl: "无效的 API 地址",
  invalidApiToken: "API Token 不能为空",

  // General
  unknown: "发生未知错误",
  networkError: "网络错误，请检查网络连接",
  retry: "操作失败，请重试",
} as const;

// ---------------------------------------------------------------------------
// Status labels (Chinese)
// ---------------------------------------------------------------------------

export const STATUS_LABELS = {
  online: "在线",
  offline: "离线",
  loading: "加载中",
  error: "错误",
  pending: "等待中",
  uploading: "上传中",
  success: "成功",
  failed: "失败",
  paused: "已暂停",
  cancelled: "已取消",
} as const;

// ---------------------------------------------------------------------------
// Navigation paths
// ---------------------------------------------------------------------------

export const ROUTES = {
  dashboard: "/",
  upload: "/upload",
  history: "/history",
  photos: "/photos",
  albums: "/albums",
  settings: "/settings",
} as const;
