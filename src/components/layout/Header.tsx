"use client";

import { Moon, Sun, Workflow } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  onResetDemo?: () => void;
}

export function Header({ onResetDemo }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Workflow className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              ticket-to-pr-demo
            </p>
            <p className="text-xs text-muted-foreground">
              Jira + GitHub MCP agent workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onResetDemo ? (
            <Button type="button" variant="outline" size="sm" onClick={onResetDemo}>
              Reset demo
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative size-9"
            aria-label="Toggle dark mode"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
        </div>
      </div>
    </header>
  );
}
