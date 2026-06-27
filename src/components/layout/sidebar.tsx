import { useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "仪表盘", path: "/" },
  { icon: Upload, label: "上传", path: "/upload" },
  { icon: History, label: "历史记录", path: "/history" },
  { icon: Images, label: "图片管理", path: "/photos" },
  { icon: Image, label: "相册管理", path: "/albums" },
  { icon: Settings, label: "设置", path: "/settings" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const ThemeIcon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo / Collapse toggle */}
      <div className="flex h-14 items-center border-b px-3">
        <div
          className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-300",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Upload className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="whitespace-nowrap text-lg font-semibold">
            Lsky Studio
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto shrink-0", collapsed && "mx-auto")}
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          const linkContent = (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary-foreground animate-in slide-in-from-left-1 duration-200"
                />
              )}

              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  !isActive &&
                    "group-hover:scale-110 group-hover:text-accent-foreground",
                )}
              />

              <span
                className={cn(
                  "whitespace-nowrap overflow-hidden transition-all duration-300",
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );

          // Wrap in a tooltip when collapsed so users can still read labels
          if (collapsed) {
            return (
              <Tooltip key={item.path} content={item.label} side="right">
                {linkContent}
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <div
          className={cn(
            "flex items-center gap-2 transition-all duration-300",
            collapsed ? "flex-col" : "justify-between",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden transition-all duration-300",
              collapsed ? "w-0 opacity-0 h-0" : "w-auto opacity-100",
            )}
          >
            <span className="text-xs text-muted-foreground">
              v0.1.0
            </span>
            <Tooltip content="GitHub 仓库" side="top">
              <a
                href="https://github.com/tortb/lskystudio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
              </a>
            </Tooltip>
          </div>

          <Tooltip
            content={
              theme === "light"
                ? "浅色模式"
                : theme === "dark"
                  ? "深色模式"
                  : "跟随系统"
            }
            side={collapsed ? "right" : "top"}
          >
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 transition-transform duration-200 hover:scale-110"
              onClick={cycleTheme}
              aria-label="切换主题"
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
