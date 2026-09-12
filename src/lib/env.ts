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

/** 是否使用纯前端实现（浏览器环境，上传走前端内置引擎） */
export function isWebMode() {
  return !isTauriEnv;
}
