import { useState, useEffect, useCallback, useMemo, createContext, useContext, type ReactNode } from "react";
import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Toast 类型
type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // 自动移除
    const duration = toast.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

// Toaster 组件
function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// Toast Item 组件
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const variantClasses = {
    default: "bg-background border",
    success: "bg-success text-success-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
    info: "bg-primary text-primary-foreground",
  };

  const variantIcons = {
    default: null,
    success: <CheckCircle className="h-4 w-4" />,
    destructive: <XCircle className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all duration-300",
        variantClasses[toast.variant || "default"],
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      )}
    >
      {variantIcons[toast.variant || "default"]}
      <div className="flex-1">
        {toast.title && <p className="text-sm font-medium">{toast.title}</p>}
        {toast.description && <p className="text-sm opacity-90">{toast.description}</p>}
      </div>
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// 便捷方法
export function toast(_options: Omit<Toast, "id">) {
  // 这个函数需要在组件内使用 useToast
  // 这里只是一个类型定义
}

// Toast 快捷方法 Hook
export function useToastActions() {
  const { addToast } = useToast();

  return useMemo(() => ({
    success: (title: string, description?: string) =>
      addToast({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      addToast({ title, description, variant: "destructive" }),
    warning: (title: string, description?: string) =>
      addToast({ title, description, variant: "warning" }),
    info: (title: string, description?: string) =>
      addToast({ title, description, variant: "info" }),
    default: (title: string, description?: string) =>
      addToast({ title, description, variant: "default" }),
  }), [addToast]);
}
