import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addLabel,
  appendEmptyCommitOnBranch,
  createBranch,
  createPR,
} from "@/lib/mcp/github-client";
import { logger } from "@/lib/logger";
import type { AgentLogEntry } from "@/lib/mcp/types";
import { agentLogResponseSchema } from "@/lib/mcp/types";
import { githubPullRequestSchema } from "@/types/github.types";

export const runtime = "nodejs";

const bodySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branchName: z.string().min(1),
  baseBranch: z.string().min(1).default("main"),
  title: z.string().min(1),
  body: z.string(),
  draft: z.boolean().optional().default(true),
  jiraLabel: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const mergedLog: AgentLogEntry[] = [];
  try {
    const branchRes = await createBranch({
      owner: d.owner,
      repo: d.repo,
      branch: d.branchName,
      fromBranch: d.baseBranch,
    });
    mergedLog.push(...branchRes.agentLog);

    const emptyRes = await appendEmptyCommitOnBranch({
      owner: d.owner,
      repo: d.repo,
      branch: d.branchName,
    });
    mergedLog.push(...emptyRes.agentLog);

    const prRes = await createPR({
      owner: d.owner,
      repo: d.repo,
      title: d.title,
      body: d.body,
      head: d.branchName,
      base: d.baseBranch,
      draft: d.draft,
    });
    mergedLog.push(...prRes.agentLog);

    const labelRes = await addLabel({
      owner: d.owner,
      repo: d.repo,
      issueNumber: prRes.pr.number,
      labels: [d.jiraLabel],
    });
    mergedLog.push(...labelRes.agentLog);

    const pr = githubPullRequestSchema.parse(prRes.pr);
    const logCheck = agentLogResponseSchema.safeParse(mergedLog);
    return NextResponse.json({
      pr,
      agentLog: logCheck.success ? logCheck.data : mergedLog,
    });
  } catch (error) {
    logger.error("POST /api/github/pr failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    const logCheck = agentLogResponseSchema.safeParse(mergedLog);
    return NextResponse.json(
      {
        error: "Failed to create branch/PR or add label",
        agentLog: logCheck.success ? logCheck.data : mergedLog,
      },
      { status: 502 },
    );
  }
}
