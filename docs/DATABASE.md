# SQLite 数据库设计

## 1. 数据库概述

### 1.1 技术选型

- **数据库引擎：** SQLite 3.x
- **Rust 驱动：** rusqlite (bundled)
- **Node.js 驱动：** better-sqlite3
- **存储位置：** 
  - Windows: `%APPDATA%/lsky-studio/data.db`
  - Linux: `~/.config/lsky-studio/data.db`

### 1.2 设计原则

- 单一数据库文件
- 使用 WAL 模式提高并发性能
- 所有表包含 `created_at` 和 `updated_at` 字段
- 使用软删除（`deleted_at`）
- 外键约束

---

## 2. 表结构设计

### 2.1 上传历史表 (upload_history)

```sql
CREATE TABLE upload_history (
    id TEXT PRIMARY KEY,
    
    -- 文件信息
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_hash TEXT,
    
    -- 上传信息
    status TEXT NOT NULL DEFAULT 'pending',
    progress REAL DEFAULT 0,
    uploaded_bytes INTEGER DEFAULT 0,
    
    -- 结果信息
    url TEXT,
    thumb_url TEXT,
    delete_url TEXT,
    markdown_url TEXT,
    html_url TEXT,
    bbcode_url TEXT,
    
    -- 服务器信息
    strategy_id TEXT,
    album_id TEXT,
    
    -- 错误信息
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- 时间信息
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- 索引
CREATE INDEX idx_upload_history_status ON upload_history(status);
CREATE INDEX idx_upload_history_created_at ON upload_history(created_at);
CREATE INDEX idx_upload_history_file_name ON upload_history(file_name);
CREATE INDEX idx_upload_history_album_id ON upload_history(album_id);
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，nanoid 生成 |
| file_name | TEXT | 文件名 |
| file_path | TEXT | 文件路径 |
| file_size | INTEGER | 文件大小（字节） |
| file_type | TEXT | MIME 类型 |
| file_hash | TEXT | 文件 MD5 哈希 |
| status | TEXT | 状态：pending/uploading/success/failed/cancelled |
| progress | REAL | 进度 0-100 |
| uploaded_bytes | INTEGER | 已上传字节数 |
| url | TEXT | 图片 URL |
| thumb_url | TEXT | 缩略图 URL |
| delete_url | TEXT | 删除链接 |
| markdown_url | TEXT | Markdown 格式链接 |
| html_url | TEXT | HTML 格式链接 |
| bbcode_url | TEXT | BBCode 格式链接 |
| strategy_id | TEXT | 存储策略 ID |
| album_id | TEXT | 相册 ID |
| error_code | TEXT | 错误代码 |
| error_message | TEXT | 错误信息 |
| retry_count | INTEGER | 重试次数 |
| started_at | TEXT | 开始时间 |
| completed_at | TEXT | 完成时间 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |
| deleted_at | TEXT | 删除时间（软删除） |

---

### 2.2 配置表 (config)

```sql
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    encrypted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 预置配置
INSERT INTO config (key, value) VALUES 
    ('api_url', ''),
    ('api_token', ''),
    ('strategy_id', ''),
    ('album_id', ''),
    ('concurrency', '3'),
    ('retry_count', '3'),
    ('retry_delay', '1000'),
    ('proxy_enabled', '0'),
    ('proxy_url', ''),
    ('theme', 'system'),
    ('language', 'zh-CN'),
    ('auto_copy_url', '1'),
    ('compress_enabled', '0'),
    ('compress_quality', '80');
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| key | TEXT | 配置键名 |
| value | TEXT | 配置值（JSON 字符串） |
| encrypted | INTEGER | 是否加密存储（0/1） |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

---

### 2.3 相册表 (albums)

```sql
CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    remote_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    image_count INTEGER DEFAULT 0,
    cover_url TEXT,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_albums_remote_id ON albums(remote_id);
CREATE INDEX idx_albums_name ON albums(name);
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，nanoid 生成 |
| remote_id | TEXT | 远程相册 ID |
| name | TEXT | 相册名称 |
| description | TEXT | 相册描述 |
| image_count | INTEGER | 图片数量 |
| cover_url | TEXT | 封面图 URL |
| synced_at | TEXT | 最后同步时间 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |
| deleted_at | TEXT | 删除时间（软删除） |

---

### 2.4 存储策略表 (strategies)

```sql
CREATE TABLE strategies (
    id TEXT PRIMARY KEY,
    remote_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_strategies_remote_id ON strategies(remote_id);
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，nanoid 生成 |
| remote_id | TEXT | 远程策略 ID |
| name | TEXT | 策略名称 |
| description | TEXT | 策略描述 |
| synced_at | TEXT | 最后同步时间 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

---

### 2.5 任务队列表 (task_queue)

```sql
CREATE TABLE task_queue (
    id TEXT PRIMARY KEY,
    history_id TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (history_id) REFERENCES upload_history(id)
);

CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_priority ON task_queue(priority DESC);
CREATE INDEX idx_task_queue_scheduled_at ON task_queue(scheduled_at);
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，nanoid 生成 |
| history_id | TEXT | 关联的历史记录 ID |
| priority | INTEGER | 优先级（越大越优先） |
| status | TEXT | 状态：pending/running/completed/failed/cancelled |
| retry_count | INTEGER | 已重试次数 |
| max_retries | INTEGER | 最大重试次数 |
| scheduled_at | TEXT | 计划执行时间 |
| started_at | TEXT | 开始时间 |
| completed_at | TEXT | 完成时间 |
| error_message | TEXT | 错误信息 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

---

### 2.6 日志表 (logs)

```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_source ON logs(source);
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| level | TEXT | 日志级别：debug/info/warn/error |
| message | TEXT | 日志消息 |
| context | TEXT | 上下文信息（JSON） |
| source | TEXT | 日志来源模块 |
| created_at | TEXT | 创建时间 |

---

## 3. 数据库迁移

### 3.1 迁移策略

```sql
-- 迁移版本表
CREATE TABLE migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2 迁移文件命名

```
db/migrations/
├── 001_initial_schema.sql
├── 002_add_indexes.sql
├── 003_add_encrypted_config.sql
└── ...
```

### 3.3 迁移流程

1. 检查当前版本
2. 执行未应用的迁移
3. 更新版本号
4. 记录迁移日志

---

## 4. 数据库配置

### 4.1 SQLite 配置

```sql
-- 启用 WAL 模式
PRAGMA journal_mode=WAL;

-- 设置缓存大小
PRAGMA cache_size=-64000;  -- 64MB

-- 启用外键约束
PRAGMA foreign_keys=ON;

-- 设置同步模式
PRAGMA synchronous=NORMAL;

-- 设置临时存储
PRAGMA temp_store=MEMORY;
```

### 4.2 连接池配置

```typescript
// Node.js 配置
const db = new Database('data.db', {
  verbose: console.log,
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
});

// 设置 WAL 模式
db.pragma('journal_mode = WAL');
db.pragma('cache_size = -64000');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
```

---

## 5. 数据访问层

### 5.1 Repository 模式

```typescript
// 示例：HistoryRepository
interface HistoryRepository {
  findById(id: string): Promise<HistoryRecord | null>;
  findByStatus(status: UploadStatus): Promise<HistoryRecord[]>;
  findAll(params: HistoryQueryParams): Promise<PaginatedResult<HistoryRecord>>;
  create(record: CreateHistoryDTO): Promise<HistoryRecord>;
  update(id: string, updates: UpdateHistoryDTO): Promise<HistoryRecord>;
  delete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}
```

### 5.2 事务处理

```typescript
// 示例：批量插入
const insertMany = db.transaction((records: HistoryRecord[]) => {
  const stmt = db.prepare(`
    INSERT INTO upload_history (id, file_name, file_path, file_size, file_type, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const record of records) {
    stmt.run(record.id, record.fileName, record.filePath, record.fileSize, record.fileType, record.status);
  }
});

insertMany(records);
```

---

## 6. 数据备份与恢复

### 6.1 备份策略

- 每日自动备份（可配置）
- 保留最近 7 天备份
- 备份文件命名：`data.db.backup.2024-01-01`

### 6.2 备份命令

```sql
-- 在线备份
VACUUM INTO 'data.db.backup';
```

### 6.3 恢复流程

1. 关闭应用
2. 替换数据库文件
3. 启动应用
4. 验证数据完整性

---

## 7. 性能优化

### 7.1 索引策略

- 频繁查询的字段建立索引
- 复合索引优化多条件查询
- 定期分析查询性能

### 7.2 查询优化

- 使用 EXPLAIN QUERY PLAN 分析
- 避免 SELECT *
- 使用 LIMIT 限制结果集
- 批量操作使用事务

### 7.3 维护任务

```sql
-- 定期执行
PRAGMA optimize;
VACUUM;
ANALYZE;
```

---

## 8. 数据安全

### 8.1 敏感数据加密

- Token 使用 AES-256 加密
- 加密密钥存储在系统 Keychain
- 查询时自动解密

### 8.2 SQL 注入防护

- 使用参数化查询
- 禁止字符串拼接 SQL
- 输入验证

### 8.3 访问控制

- 数据库文件权限设置
- 应用内权限控制
- 审计日志
