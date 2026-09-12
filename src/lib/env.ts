/**
 * 运行环境检测
 *
 * Tauri v2 默认不会向 window 注入 `__TAURI__` 全局对象（除非在 tauri.conf.json
 * 中开启 app.withGlobalTauri）。因此判断是否运行在桌面容器中必须使用
 * `@tauri-apps/api/core` 提供的 isTauri()，否则会被误判为浏览器环境，
 * 导致自定义标题栏（含窗口控制按钮）不渲染。
 */

import { isTauri as detectTauri } from "@tauri-apps/api/core";

function detect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return detectTauri();
  } catch {
    return false;
  }
}

/** 是否运行在 Tauri 桌面容器中（模块加载时确定，运行期不会变化） */
export const isTauriEnv = detect();

/**
 * Node.js IPC 后端是否已就绪。
 * 后端在正式构建中尚未随包分发，未就绪时自动回退到前端内置上传引擎，
 * 因此这里采用「就绪才用、否则回退」的策略，保证功能始终可用。
 */
let nodeBackendReady = false;

export function markNodeBackendReady() {
  nodeBackendReady = true;
}

export function isNodeBackendReady() {
  return nodeBackendReady;
}

/** 是否使用纯前端实现（非 Tauri，或 Tauri 中 Node 后端未就绪） */
export function isWebMode() {
  return !(isTauriEnv && nodeBackendReady);
}
