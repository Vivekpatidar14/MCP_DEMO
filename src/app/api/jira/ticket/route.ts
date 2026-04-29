import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { addComment, getTicket } from "@/lib/mcp/jira-client";
import { logger } from "@/lib/logger";
import { agentLogResponseSchema } from "@/lib/mcp/types";
import { jiraTicketSchema } from "@/types/jira.types";

export const runtime = "nodejs";

const postBodySchema = z.object({
  intent: z.literal("add_comment"),
  issueKey: z.string().min(1),
  body: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const parsed = z
    .object({ id: z.string().min(1, "Ticket id is required") })
    .safeParse({ id: request.nextUrl.searchParams.get("id") ?? "" });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  try {
    const { ticket, agentLog } = await getTicket(parsed.data.id);
    const logCheck = agentLogResponseSchema.safeParse(agentLog);
    return NextResponse.json({
      ticket: jiraTicketSchema.parse(ticket),
      agentLog: logCheck.success ? logCheck.data : agentLog,
    });
  } catch (error) {
    logger.error("GET /api/jira/ticket failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch Jira ticket" },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const body = postBodySchema.safeParse(json);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  try {
    const { agentLog } = await addComment(body.data.issueKey, body.data.body);
    const logCheck = agentLogResponseSchema.safeParse(agentLog);
    return NextResponse.json({
      ok: true,
      agentLog: logCheck.success ? logCheck.data : agentLog,
    });
  } catch (error) {
    logger.error("POST /api/jira/ticket failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to add Jira comment" },
      { status: 502 },
    );
  }
}
