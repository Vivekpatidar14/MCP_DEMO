"use client";

import { GitBranch, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GitHubRepo } from "@/types/github.types";
import { cn } from "@/lib/utils";

export interface RepoSelectorProps {
  repos: GitHubRepo[];
  selected: GitHubRepo | null;
  onSelect: (repo: GitHubRepo) => void;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

export function RepoSelector({
  repos,
  selected,
  onSelect,
  loading,
  error,
  onReload,
}: RepoSelectorProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Target repository</CardTitle>
          <CardDescription>
            Repositories are loaded with GitHub MCP{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              search_repositories
            </code>
            .
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={onReload}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Reload"
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {loading && repos.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Loading repositories…
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {repos.map((repo) => {
              const active = selected?.fullName === repo.fullName;
              return (
                <li key={repo.fullName}>
                  <button
                    type="button"
                    onClick={() => onSelect(repo)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/80 hover:bg-muted/60",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <GitBranch className="size-4 text-muted-foreground" />
                      {repo.fullName}
                    </span>
                    <div className="flex items-center gap-2">
                      {repo.private ? (
                        <Badge variant="outline" className="text-[10px]">
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Public
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && repos.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground">
            No repositories returned. Check{" "}
            <code className="rounded bg-muted px-1">GITHUB_DEFAULT_OWNER</code>{" "}
            and token scopes.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
