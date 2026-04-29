import { NextResponse } from "next/server";
import { getProjects } from "@/lib/mcp/jira-client";
import { logger } from "@/lib/logger";
import { agentLogResponseSchema } from "@/lib/mcp/types";
import { jiraProjectSchema, type JiraProject } from "@/types/jira.types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { projects, agentLog } = await getProjects();
    const normalized: JiraProject[] = projects.map((p) =>
      jiraProjectSchema.parse(p),
    );
    const logCheck = agentLogResponseSchema.safeParse(agentLog);
    return NextResponse.json({
      projects: normalized,
      agentLog: logCheck.success ? logCheck.data : agentLog,
    });
  } catch (error) {
    logger.error("GET /api/jira/projects failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to list Jira projects" },
      { status: 502 },
    );
  }
}
