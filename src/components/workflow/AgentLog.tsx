"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AgentLogEntry } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

export interface AgentLogProps {
  entries: AgentLogEntry[];
}

function StatusBadge({ status }: { status: AgentLogEntry["status"] }) {
  const variant =
    status === "success"
      ? "default"
      : status === "error"
        ? "destructive"
        : "secondary";
  return (
    <Badge
      variant={variant}
      className={cn(
        "text-[10px] uppercase tracking-wide",
        status === "pending" &&
          "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200",
        status === "success" &&
          "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100",
        status === "error" &&
          "border-destructive/60 bg-destructive/10 text-destructive dark:text-red-100",
      )}
    >
      {status}
    </Badge>
  );
}

export function AgentLog({ entries }: AgentLogProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  return (
    <Card className="flex h-full min-h-[320px] flex-col border-border/80 bg-card/60 shadow-inner">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Agent log</CardTitle>
        <CardDescription>
          Every MCP tool call with timestamps, status, and payloads (like
          Cursor&apos;s tool trace).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden pt-0">
        <div className="thin-scrollbar max-h-[420px] flex-1 space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Run a step to stream MCP tool calls here.
            </p>
          ) : null}
          {entries.map((entry) => (
            <details
              key={entry.id}
              className="group rounded-lg border border-border/70 bg-background/80 px-3 py-2 shadow-sm open:ring-1 open:ring-primary/15"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                <span className="truncate font-mono text-xs text-foreground/90">
                  {entry.toolName}
                </span>
                <StatusBadge status={entry.status} />
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </summary>
              <Separator className="my-2" />
              {entry.errorMessage ? (
                <p className="mb-2 text-xs text-destructive">{entry.errorMessage}</p>
              ) : null}
              <pre className="max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                {entry.payload !== undefined
                  ? JSON.stringify(entry.payload, null, 2)
                  : "—"}
              </pre>
            </details>
          ))}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}
