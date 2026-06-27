import { useState, createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Tabs 类型
interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within a Tabs component");
  }
  return context;
}

// Tabs 组件
interface TabsProps {
  children: ReactNode;
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(value || defaultValue);

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider
      value={{ activeTab: value || activeTab, setActiveTab: handleTabChange }}
    >
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// TabsList 组件
interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

// TabsTrigger 组件
interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({
  children,
  value,
  className,
  disabled,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50",
        className,
      )}
      onClick={() => setActiveTab(value)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// TabsContent 组件
interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function TabsContent({ children, value, className }: TabsContentProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
