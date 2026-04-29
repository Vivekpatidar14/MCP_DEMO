"use client";

import { ExternalLink, GitPullRequest } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GitHubPullRequest } from "@/types/github.types";

export interface PullRequestCardProps {
  pr: GitHubPullRequest;
}

export function PullRequestCard({ pr }: PullRequestCardProps) {
  return (
    <Card className="border-primary/25 bg-gradient-to-br from-card to-primary/5 shadow-md ring-1 ring-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GitPullRequest className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Pull request created</CardTitle>
            <CardDescription>
              Draft PR opened via GitHub MCP (
              <code className="text-[11px]">create_branch</code>,{" "}
              <code className="text-[11px]">create_pull_request</code>,{" "}
              <code className="text-[11px]">issue_write</code>)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">#{pr.number}</Badge>
          {pr.draft ? (
            <Badge variant="secondary">Draft</Badge>
          ) : (
            <Badge variant="outline">Open</Badge>
          )}
        </div>
        <p className="text-sm font-medium leading-snug">{pr.title}</p>
        <a
          href={pr.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "default" }), "inline-flex w-fit gap-2")}
        >
          View on GitHub
          <ExternalLink className="size-4" />
        </a>
      </CardContent>
    </Card>
  );
}
