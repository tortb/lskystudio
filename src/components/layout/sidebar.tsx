import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  History,
  Image,
  Images,
  Settings,
  Sun,
  Moon,
  Monitor,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Tooltip } from "@/components/ui/tooltip";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "仪表盘", path: "/" },
  { icon: Upload, label: "上传", path: "/upload" },
  { icon: History, label: "历史记录", path: "/history" },
  { icon: Images, label: "图片管理", path: "/photos" },
  { icon: Image, label: "相册管理", path: "/albums" },
  { icon: Settings, label: "设置", path: "/settings" },
];

/**
 * 窄图标导航栏（68px）
 * 参考 macOS 侧边栏：仅图标 + 悬浮提示，选中态为强调色填充块。
 */
export function Sidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel =
    theme === "light" ? "浅色模式" : theme === "dark" ? "深色模式" : "跟随系统";

  return (
    <aside className="flex w-[68px] shrink-0 flex-col items-center border-r border-border/70 bg-card/70">
      {/* 顶部与标题栏等高，同时作为窗口拖拽区域 */}
      <div data-tauri-drag-region className="h-[38px] w-full shrink-0" />

      <nav className="flex flex-1 flex-col items-center gap-1.5 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Tooltip key={item.path} content={item.label} side="right">
              <Link
                to={item.path}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={1.75} />
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1.5 pb-3">
        <Tooltip content="GitHub 仓库" side="right">
          <a
            href="https://github.com/tortb/lskystudio"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 仓库"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Github className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </a>
        </Tooltip>

        <Tooltip content={themeLabel} side="right">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={themeLabel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ThemeIcon className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
