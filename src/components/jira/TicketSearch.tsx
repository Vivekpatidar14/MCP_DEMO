"use client";

import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorkflowStore } from "@/store/workflow.store";

export interface TicketSearchProps {
  onSearch: () => void;
}

export function TicketSearch({ onSearch }: TicketSearchProps) {
  const ticketInput = useWorkflowStore((s) => s.ticketInput);
  const setTicketInput = useWorkflowStore((s) => s.setTicketInput);
  const loading = useWorkflowStore((s) => s.isFetchingTicket);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Step 1 — Fetch ticket</CardTitle>
        <CardDescription>
          Enter a Jira issue key. The API calls Atlassian Rovo MCP over SSE.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid w-full gap-1.5 sm:max-w-md">
          <label htmlFor="ticket-id" className="text-xs font-medium text-muted-foreground">
            Ticket ID
          </label>
          <Input
            id="ticket-id"
            placeholder="PROJ-123"
            value={ticketInput}
            readOnly={loading}
            aria-busy={loading}
            onChange={(e) => setTicketInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                onSearch();
              }
            }}
          />
        </div>
        <Button
          type="button"
          className="sm:mb-0.5"
          disabled={loading || !ticketInput.trim()}
          onClick={onSearch}
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="mr-2 size-4" aria-hidden />
          )}
          Fetch ticket
        </Button>
      </CardContent>
    </Card>
  );
}
