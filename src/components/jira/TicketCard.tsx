"use client";

import { ExternalLink, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { JiraTicket } from "@/types/jira.types";

export interface TicketCardProps {
  ticket: JiraTicket;
  jiraBaseUrl: string;
}

export function TicketCard({ ticket, jiraBaseUrl }: TicketCardProps) {
  const browse = `${jiraBaseUrl.replace(/\/$/, "")}/browse/${ticket.key}`;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <span>{ticket.key}</span>
            <Badge variant="secondary">{ticket.status ?? "Unknown status"}</Badge>
            {ticket.priority ? (
              <Badge variant="outline">Priority: {ticket.priority}</Badge>
            ) : null}
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-foreground/90">
            {ticket.summary}
          </CardDescription>
        </div>
        <a
          href={browse}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open in Jira
          <ExternalLink className="size-3" />
        </a>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {ticket.assignee?.displayName ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4" />
            <span>{ticket.assignee.displayName}</span>
          </div>
        ) : null}
        <Separator />
        {ticket.description ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </p>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-foreground/90">
              {ticket.description}
            </pre>
          </div>
        ) : null}
        {ticket.acceptanceCriteria ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Acceptance criteria
            </p>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-foreground/90">
              {ticket.acceptanceCriteria}
            </pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
