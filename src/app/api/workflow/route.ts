import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { createLogEntry } from "@/lib/mcp/types";
import { agentLogResponseSchema } from "@/lib/mcp/types";
import type { AgentLogEntry } from "@/lib/mcp/types";
import {
  addLabel,
  appendEmptyCommitOnBranch,
  createBranch,
  createPR,
} from "@/lib/mcp/github-client";
import { getTicket } from "@/lib/mcp/jira-client";
import { analyseTicket } from "@/lib/workflow/ticket-to-pr";
import { logger } from "@/lib/logger";
import { ticketAnalysisSchema } from "@/types/workflow.types";
import { jiraTicketSchema } from "@/types/jira.types";
import { githubPullRequestSchema } from "@/types/github.types";

export const runtime = "nodejs";

const analyseSchema = z.object({
  intent: z.literal("analyse"),
  ticket: jiraTicketSchema,
});

const fullRunSchema = z.object({
  ticketId: z.string().min(1),
  repo: z.string().min(1),
  baseBranch: z.string().min(1).default("main"),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullRun = fullRunSchema.safeParse(json);
  if (fullRun.success) {
    try {
      const { ticketId, repo, baseBranch } = fullRun.data;
      const owner = env.GITHUB_DEFAULT_OWNER;
      const mergedLog: AgentLogEntry[] = [];

      const { ticket, agentLog: ticketLogs } = await getTicket(ticketId);
      mergedLog.push(...ticketLogs);

      const analysis = analyseTicket(ticket);

      const branchRes = await createBranch({
        owner,
        repo,
        branch: analysis.branchName,
        fromBranch: baseBranch,
      });
      mergedLog.push(...branchRes.agentLog);

      const emptyRes = await appendEmptyCommitOnBranch({
        owner,
        repo,
        branch: analysis.branchName,
      });
      mergedLog.push(...emptyRes.agentLog);

      const prRes = await createPR({
        owner,
        repo,
        title: analysis.prTitle,
        body: analysis.prBody,
        head: analysis.branchName,
        base: baseBranch,
        draft: true,
      });
      mergedLog.push(...prRes.agentLog);

      const labelRes = await addLabel({
        owner,
        repo,
        issueNumber: prRes.pr.number,
        labels: [ticket.key],
      });
      mergedLog.push(...labelRes.agentLog);

      const logCheck = agentLogResponseSchema.safeParse(mergedLog);
      return NextResponse.json({
        ticket: jiraTicketSchema.parse(ticket),
        analysis: ticketAnalysisSchema.parse(analysis),
        pr: githubPullRequestSchema.parse(prRes.pr),
        agentLog: logCheck.success ? logCheck.data : mergedLog,
      });
    } catch (error) {
      logger.error("POST /api/workflow full run failed", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: "Full workflow failed" },
        { status: 502 },
      );
    }
  }

  const analysed = analyseSchema.safeParse(json);
  if (analysed.success) {
    try {
      const analysis = analyseTicket(analysed.data.ticket);
      const syntheticLog = [
        createLogEntry({
          toolName: "workflow.analyse_ticket",
          status: "success",
          payload: { source: "server", ticketKey: analysed.data.ticket.key },
        }),
      ];
      const logCheck = agentLogResponseSchema.safeParse(syntheticLog);
      return NextResponse.json({
        analysis: ticketAnalysisSchema.parse(analysis),
        agentLog: logCheck.success ? logCheck.data : syntheticLog,
      });
    } catch (error) {
      logger.error("POST /api/workflow analyse failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to analyse ticket" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Unsupported workflow intent" },
    { status: 400 },
  );
}
