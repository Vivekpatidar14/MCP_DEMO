"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { TicketSearch } from "@/components/jira/TicketSearch";
import { TicketCard } from "@/components/jira/TicketCard";
import { RepoSelector } from "@/components/github/RepoSelector";
import { PullRequestCard } from "@/components/github/PullRequestCard";
import { StepTracker } from "@/components/workflow/StepTracker";
import { AgentLog } from "@/components/workflow/AgentLog";
import { agentLogEntrySchema } from "@/lib/mcp/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AgentLogEntry } from "@/lib/mcp/types";
import { parseJiraTicketJson } from "@/types/jira.types";
import {
  githubPullRequestSchema,
  githubRepoSchema,
  parseGitHubRepoJson,
} from "@/types/github.types";
import { ticketAnalysisSchema } from "@/types/workflow.types";
import { useWorkflowStore } from "@/store/workflow.store";
import { Rocket } from "lucide-react";

export interface WorkflowPanelProps {
  jiraBaseUrl: string;
}

const agentLogArraySchema = z.array(agentLogEntrySchema);

function mergeLogs(raw: unknown, append: (entries: AgentLogEntry[]) => void) {
  const parsed = agentLogArraySchema.safeParse(raw);
  if (parsed.success && parsed.data.length) {
    append(parsed.data);
  }
}

export function WorkflowPanel({ jiraBaseUrl }: WorkflowPanelProps) {
  const {
    activeStep,
    ticket,
    analysis,
    selectedRepo,
    pr,
    agentLog,
    ticketInput,
    setTicket,
    setAnalysis,
    patchAnalysis,
    setSelectedRepo,
    setPr,
    appendAgentLog,
    clearAgentLog,
    setActiveStep,
    setLoading,
  } = useWorkflowStore();

  const [repoList, setRepoList] = useState<z.infer<typeof githubRepoSchema>[]>(
    [],
  );
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);

  const loadRepos = useCallback(async () => {
    setRepoLoading(true);
    setRepoError(null);
    try {
      const res = await fetch("/api/github/repos");
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json && "error" in json
            ? String((json as { error: unknown }).error)
            : "Failed to load repositories";
        throw new Error(msg);
      }
      const body = z
        .object({
          repos: z.array(z.unknown()),
          agentLog: z.array(z.unknown()).optional(),
        })
        .parse(json);
      mergeLogs(body.agentLog, appendAgentLog);
      setRepoList(body.repos.map((r) => parseGitHubRepoJson(r)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRepoError(message);
      toast.error(message);
    } finally {
      setRepoLoading(false);
    }
  }, [appendAgentLog]);

  useEffect(() => {
    void loadRepos();
    // Intentionally once on mount — repos back the dropdown for the whole demo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchTicket = async () => {
    const id = ticketInput.trim();
    if (!id) {
      toast.error("Enter a ticket id");
      return;
    }
    setLoading("isFetchingTicket", true);
    clearAgentLog();
    try {
      const res = await fetch(`/api/jira/ticket?id=${encodeURIComponent(id)}`);
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? JSON.stringify((json as { error: unknown }).error)
            : "Ticket fetch failed",
        );
      }
      const body = z
        .object({
          ticket: z.unknown(),
          agentLog: z.array(z.unknown()).optional(),
        })
        .parse(json);
      mergeLogs(body.agentLog, appendAgentLog);
      const nextTicket = parseJiraTicketJson(body.ticket);
      setTicket(nextTicket);
      setActiveStep("analyse");
      toast.success(`Loaded ${nextTicket.key}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setLoading("isFetchingTicket", false);
    }
  };

  const handleAnalyse = async () => {
    if (!ticket) {
      toast.error("Fetch a ticket first");
      return;
    }
    setLoading("isAnalysing", true);
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "analyse", ticket }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: unknown }).error)
            : "Analysis failed",
        );
      }
      const body = z
        .object({
          analysis: z.unknown(),
          agentLog: z.array(z.unknown()).optional(),
        })
        .parse(json);
      mergeLogs(body.agentLog, appendAgentLog);
      setAnalysis(ticketAnalysisSchema.parse(body.analysis));
      setActiveStep("create_pr");
      toast.success("Analysis ready — tweak fields then open a PR");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setLoading("isAnalysing", false);
    }
  };

  const handleCreatePr = async () => {
    if (!analysis || !selectedRepo) {
      toast.error("Pick a repository and ensure analysis is present");
      return;
    }
    if (!ticket) {
      toast.error("Missing ticket");
      return;
    }
    setLoading("isCreatingPr", true);
    try {
      const [owner, repo] = selectedRepo.fullName.split("/");
      if (!owner || !repo) {
        throw new Error("Invalid repository selection");
      }
      const base = selectedRepo.defaultBranch ?? "main";
      const res = await fetch("/api/github/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          branchName: analysis.branchName,
          baseBranch: base,
          title: analysis.prTitle,
          body: analysis.prBody,
          draft: true,
          jiraLabel: ticket.key,
        }),
      });
      const json: unknown = await res.json();
      mergeLogs(
        typeof json === "object" && json && "agentLog" in json
          ? (json as { agentLog: unknown }).agentLog
          : [],
        appendAgentLog,
      );
      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: unknown }).error)
            : "PR creation failed",
        );
      }
      const body = z.object({ pr: z.unknown() }).parse(json);
      setPr(githubPullRequestSchema.parse(body.pr));
      setActiveStep("done");
      toast.success("Draft PR created");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setLoading("isCreatingPr", false);
    }
  };

  const handleJiraComment = async () => {
    if (!ticket || !pr) {
      toast.error("PR and ticket are required");
      return;
    }
    setLoading("isUpdatingJira", true);
    try {
      const bodyMd = `**GitHub draft PR:** ${pr.htmlUrl}`;
      const res = await fetch("/api/jira/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "add_comment",
          issueKey: ticket.key,
          body: bodyMd,
        }),
      });
      const json: unknown = await res.json();
      mergeLogs(
        typeof json === "object" && json && "agentLog" in json
          ? (json as { agentLog: unknown }).agentLog
          : [],
        appendAgentLog,
      );
      if (!res.ok) {
        throw new Error(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: unknown }).error)
            : "Jira comment failed",
        );
      }
      toast.success("Comment posted on Jira");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setLoading("isUpdatingJira", false);
    }
  };

  const fetching = useWorkflowStore((s) => s.isFetchingTicket);
  const analysing = useWorkflowStore((s) => s.isAnalysing);
  const creating = useWorkflowStore((s) => s.isCreatingPr);
  const updatingJira = useWorkflowStore((s) => s.isUpdatingJira);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="space-y-6">
        <StepTracker
          activeStep={activeStep}
          isFetchingTicket={fetching}
          isAnalysing={analysing}
          isCreatingPr={creating}
          isRepoLoading={repoLoading}
          isUpdatingJira={updatingJira}
        />
        <TicketSearch onSearch={() => void handleFetchTicket()} />
        {ticket && !fetching ? (
          <TicketCard ticket={ticket} jiraBaseUrl={jiraBaseUrl} />
        ) : null}

        <Card
          className={
            activeStep === "fetch_ticket" && !ticket
              ? "opacity-60"
              : "border-border/80 shadow-sm"
          }
        >
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Analyse</CardTitle>
            <CardDescription>
              Server-side heuristics build branch and PR copy (no extra LLM
              call — keeps the demo deterministic).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!analysis ? (
              <Button
                type="button"
                disabled={!ticket || analysing}
                onClick={() => void handleAnalyse()}
              >
                {analysing ? "Analysing…" : "Run analysis"}
              </Button>
            ) : (
              <>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Branch name
                  </label>
                  <Input
                    value={analysis.branchName}
                    onChange={(e) =>
                      patchAnalysis({ branchName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    PR title
                  </label>
                  <Input
                    value={analysis.prTitle}
                    onChange={(e) => patchAnalysis({ prTitle: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    PR description (markdown)
                  </label>
                  <Textarea
                    rows={10}
                    value={analysis.prBody}
                    onChange={(e) => patchAnalysis({ prBody: e.target.value })}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div
          className={
            activeStep === "fetch_ticket" || activeStep === "analyse"
              ? "pointer-events-none opacity-50"
              : ""
          }
        >
          <RepoSelector
            repos={repoList}
            selected={selectedRepo}
            onSelect={setSelectedRepo}
            loading={repoLoading}
            error={repoError}
            onReload={() => void loadRepos()}
          />
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Step 3 — Create draft PR</CardTitle>
            <CardDescription>
              Creates a branch from the default branch, opens a draft PR, and
              tags the issue key as a label via GitHub MCP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="gap-2"
              disabled={
                !analysis ||
                !selectedRepo ||
                creating ||
                activeStep === "fetch_ticket"
              }
              onClick={() => void handleCreatePr()}
            >
              <Rocket className="size-4" />
              {creating ? "Creating…" : "Create draft PR"}
            </Button>
          </CardContent>
        </Card>

        {pr ? (
          <div className="space-y-4">
            <PullRequestCard pr={pr} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 4 — Update Jira</CardTitle>
                <CardDescription>
                  Posts a comment on the Jira issue with the PR link (MCP
                  comment tools).
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={updatingJira}
                  onClick={() => void handleJiraComment()}
                >
                  {updatingJira ? "Posting…" : "Update Jira ticket"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}
      </div>
      <div className="lg:sticky lg:top-20 lg:self-start">
        <AgentLog entries={agentLog} />
      </div>
    </div>
  );
}
