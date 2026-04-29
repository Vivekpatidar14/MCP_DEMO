import { NextResponse } from "next/server";
import { listRepos } from "@/lib/mcp/github-client";
import { logger } from "@/lib/logger";
import { agentLogResponseSchema } from "@/lib/mcp/types";
import { githubRepoSchema, type GitHubRepo } from "@/types/github.types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { repos, agentLog } = await listRepos();
    const normalized: GitHubRepo[] = repos.map((r) =>
      githubRepoSchema.parse(r),
    );
    const logCheck = agentLogResponseSchema.safeParse(agentLog);
    return NextResponse.json({
      repos: normalized,
      agentLog: logCheck.success ? logCheck.data : agentLog,
    });
  } catch (error) {
    logger.error("GET /api/github/repos failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to list GitHub repositories" },
      { status: 502 },
    );
  }
}
