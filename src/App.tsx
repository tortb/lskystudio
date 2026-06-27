import { Component, ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AppLayout } from "./components/layout/app-layout";
import { ToastProvider } from "./components/ui/toaster";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { Button } from "./components/ui/button";
import { useSystem } from "./hooks/use-system";
import DashboardPage from "./features/dashboard";
import UploadPage from "./features/upload";
import HistoryPage from "./features/history";
import PhotoPage from "./features/photos";
import AlbumPage from "./features/album";
import SettingsPage from "./features/settings";

// 声明 Tauri 全局变量
declare global {
  interface Window {
    __TAURI__?: Record<string, unknown>;
  }
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              应用发生了错误
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              {this.state.error?.message ?? "未知错误，请尝试重新加载应用"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              重试
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// App content (uses hooks, must be inside providers)
// ---------------------------------------------------------------------------

function AppContent() {
  const { isReady, error: nodeError } = useSystem();

  // 检测是否在 Tauri 环境中
  const isTauri = window.__TAURI__ !== undefined;

  // 在浏览器模式下，跳过后端检查
  if (!isTauri) {
    return (
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/photos" element={<PhotoPage />} />
          <Route path="/albums" element={<AlbumPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    );
  }

  // Show a full-screen loading state while the Node.js backend is starting up.
  // Once the "node_ready" event fires, isReady flips to true and we render
  // the actual application routes.
  if (!isReady) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground animate-in fade-in duration-300">
          {nodeError
            ? `后端启动失败: ${nodeError}`
            : "正在启动后端服务，请稍候..."}
        </p>
      </div>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/albums" element={<AlbumPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
