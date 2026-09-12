import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Titlebar } from "./titlebar";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * 应用外壳布局
 * 参考 macOS「系统偏好设置」：左侧通高的窄导航栏 + 右侧标题栏与主内容区。
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Titlebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1240px] px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
