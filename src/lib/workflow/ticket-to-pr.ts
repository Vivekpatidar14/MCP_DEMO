import { env } from "@/env";
import type { JiraTicket } from "@/types/jira.types";
import type { TicketAnalysis } from "@/types/workflow.types";
import { ticketAnalysisSchema } from "@/types/workflow.types";

function slugify(input: string, maxLength: number): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
  return s.length > 0 ? s : "change";
}

export function analyseTicket(ticket: JiraTicket): TicketAnalysis {
  const base = `${ticket.key}-${slugify(ticket.summary, 40)}`;
  const branchName = `feature/${base}`;
  const prTitle = `${ticket.key}: ${ticket.summary}`;
  const ac =
    ticket.acceptanceCriteria && ticket.acceptanceCriteria.trim().length > 0
      ? `## Acceptance criteria\n\n${ticket.acceptanceCriteria}\n\n`
      : "";
  const desc =
    ticket.description && ticket.description.trim().length > 0
      ? `## Jira description\n\n${ticket.description}\n\n`
      : "";
  const prBody = [
    `Automated draft PR from **ticket-to-pr-demo** (MCP workflow).`,
    ``,
    `**Jira:** [\`${ticket.key}\`](${env.JIRA_BASE_URL.replace(/\/$/, "")}/browse/${ticket.key})`,
    ``,
    desc,
    ac,
    `---`,
    `_Generated for demo purposes._`,
  ].join("\n");

  return ticketAnalysisSchema.parse({
    branchName,
    prTitle,
    prBody,
  });
}
