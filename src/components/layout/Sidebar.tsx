"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, LayoutDashboard, Server, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 border-r border-border/80 bg-card/40 lg:block",
        className,
      )}
    >
      <div className="flex h-full flex-col gap-3 p-3">
        <Card className="border-border/80 bg-card/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Demo map
            </CardTitle>
            <CardDescription className="text-xs">
              Cursor calls MCP tools from API routes; the UI mirrors agent
              progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-3.5 text-primary" />
              Dashboard
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-500" />
              Atlassian Rovo MCP
              <Badge variant="secondary" className="text-[10px]">
                Jira
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Server className="size-3.5" />
              GitHub remote MCP
              <Badge variant="secondary" className="text-[10px]">
                PR
              </Badge>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-3.5" />
              See README for tokens, toolset headers, and presentation tips.
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
