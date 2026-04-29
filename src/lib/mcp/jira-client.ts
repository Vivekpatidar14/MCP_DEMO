import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { JiraProject, JiraTicket } from "@/types/jira.types";
import { jiraProjectSchema, jiraTicketSchema } from "@/types/jira.types";
import type { AgentLogEntry } from "@/lib/mcp/types";
import { logToolCall } from "@/lib/mcp/types";

function jiraBase(): string {
  return env.JIRA_BASE_URL.replace(/\/$/, "");
}

function basicAuthHeader(): string {
  const raw = `${env.JIRA_USER_EMAIL}:${env.JIRA_API_TOKEN}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

function extractDescriptionText(description: unknown): string | null {
  if (description == null) {
    return null;
  }
  if (typeof description === "string") {
    return description;
  }
  if (typeof description === "object" && description !== null) {
    const doc = description as { type?: string; content?: unknown[]; text?: string };
    if (doc.type === "doc" && Array.isArray(doc.content)) {
      const walk = (nodes: unknown[]): string => {
        return nodes
          .map((node) => {
            if (!node || typeof node !== "object") {
              return "";
            }
            const n = node as { type?: string; text?: string; content?: unknown[] };
            if (n.type === "text" && n.text) {
              return n.text;
            }
            if (Array.isArray(n.content)) {
              return walk(n.content);
            }
            return "";
          })
          .join("");
      }
      return walk(doc.content).trim() || null;
    }
    try {
      return JSON.stringify(description);
    } catch {
      return String(description);
    }
  }
  return String(description);
}

const jiraIssueFieldsSchema = z
  .object({
    summary: z.string().optional(),
    description: z.unknown().optional(),
    assignee: z
      .object({
        displayName: z.string().optional(),
        emailAddress: z.string().optional(),
        accountId: z.string().optional(),
      })
      .nullable()
      .optional(),
    priority: z.object({ name: z.string() }).nullable().optional(),
    status: z.object({ name: z.string() }).optional(),
    project: z.object({ key: z.string() }).optional(),
  })
  .passthrough();

const jiraIssueEnvelopeSchema = z
  .object({
    key: z.string().optional(),
    id: z.string().optional(),
    fields: jiraIssueFieldsSchema.optional(),
  })
  .passthrough();

function summarizeIssuePayload(raw: unknown): string {
  const parsed = jiraIssueEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return "issue (unparsed)";
  }
  const key = parsed.data.key ?? parsed.data.id ?? "?";
  const summary = parsed.data.fields?.summary ?? "";
  return `${key}${summary ? `: ${summary.slice(0, 80)}${summary.length > 80 ? "…" : ""}` : ""}`;
}

function normalizeIssuePayload(raw: unknown, fallbackKey: string): JiraTicket {
  const envelope = jiraIssueEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    logger.error("Jira issue JSON did not match expected envelope", {
      issues: envelope.error.flatten(),
    });
    return jiraTicketSchema.parse({
      id: fallbackKey,
      key: fallbackKey,
      summary: "(could not parse Jira issue payload)",
      description: typeof raw === "string" ? raw : JSON.stringify(raw),
      acceptanceCriteria: null,
      assignee: undefined,
      priority: null,
      status: undefined,
      projectKey: undefined,
    });
  }
  const e = envelope.data;
  const fields = e.fields ?? {};
  const description = extractDescriptionText(fields.description);
  let acceptanceCriteria: string | null = null;
  const custom = fields as Record<string, unknown>;
  for (const [, v] of Object.entries(custom)) {
    if (typeof v === "string" && v.length > 0 && v !== fields.summary) {
      if (/^\d{4}-\d{2}-\d{2}T/.test(v) || /^\d+\|[a-z]+:/i.test(v)) {
        continue;
      }
      acceptanceCriteria = acceptanceCriteria ?? v;
    }
    if (v && typeof v === "object" && "content" in (v as object)) {
      const text = extractDescriptionText(v);
      if (text) {
        acceptanceCriteria = text;
        break;
      }
    }
  }
  return jiraTicketSchema.parse({
    id: e.id ?? e.key ?? fallbackKey,
    key: e.key ?? fallbackKey,
    summary: fields.summary ?? "(no summary)",
    description,
    acceptanceCriteria,
    assignee: fields.assignee ?? undefined,
    priority: fields.priority?.name ?? null,
    status: fields.status?.name,
    projectKey: fields.project?.key,
  });
}

const jiraProjectRestSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
  })
  .passthrough();

const jiraProjectListSchema = z.array(jiraProjectRestSchema);

async function jiraRestJson(options: {
  toolName: string;
  method: string;
  path: string;
  body?: unknown;
}): Promise<{ json: unknown; log: AgentLogEntry }> {
  const url = `${jiraBase()}${options.path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: options.method,
      headers: {
        Authorization: basicAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const durationMs = Date.now() - started;
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;
    } catch {
      parsed = { rawText: text.slice(0, 2000) };
    }

    if (!res.ok) {
      const detail = typeof parsed === "object" && parsed && "errorMessages" in parsed
        ? JSON.stringify((parsed as { errorMessages?: string[] }).errorMessages)
        : text.slice(0, 500);
      const err = new Error(`Jira REST ${res.status}: ${detail}`);
      logger.error("Jira REST request failed", {
        message: err.message,
        stack: err.stack,
        toolName: options.toolName,
        toolCall: logToolCall({
          toolName: options.toolName,
          endpoint: url,
          method: options.method,
          httpStatus: res.status,
          durationMs,
          summary: `Jira API error ${res.status}`,
          errorDetail: detail,
        }),
      });
      throw err;
    }

    const summary =
      options.toolName === "jira_get_issue"
        ? summarizeIssuePayload(parsed)
        : options.toolName === "jira_list_projects"
          ? "projects list"
          : options.toolName === "jira_add_comment"
            ? "comment created"
            : "ok";

    const log = logToolCall({
      toolName: options.toolName,
      endpoint: url,
      method: options.method,
      httpStatus: res.status,
      durationMs,
      summary,
    });
    return { json: parsed, log };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Jira REST")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("Jira REST transport error", { message, stack });
    throw Object.assign(new Error(message), { cause: error });
  }
}

function plainTextToAdf(text: string): Record<string, unknown> {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export async function getTicket(issueKey: string): Promise<{
  ticket: JiraTicket;
  agentLog: AgentLogEntry[];
}> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const encoded = encodeURIComponent(issueKey);
    const { json, log } = await jiraRestJson({
      toolName: "jira_get_issue",
      method: "GET",
      path: `/rest/api/3/issue/${encoded}`,
    });
    agentLog.push(log);
    if (process.env.NODE_ENV === "development") {
      logger.debug("Jira raw issue response (dev)", {
        keys:
          json && typeof json === "object"
            ? Object.keys(json as object).slice(0, 20)
            : [],
      });
    }
    const ticket = normalizeIssuePayload(json, issueKey);
    return { ticket, agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("getTicket failed", { message, stack });
    throw error;
  }
}

export async function getProjects(): Promise<{
  projects: JiraProject[];
  agentLog: AgentLogEntry[];
}> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const { json, log } = await jiraRestJson({
      toolName: "jira_list_projects",
      method: "GET",
      path: "/rest/api/3/project",
    });
    agentLog.push(log);
    const listParsed = jiraProjectListSchema.safeParse(json);
    if (!listParsed.success) {
      logger.error("Unexpected Jira projects payload", {
        issues: listParsed.error.flatten(),
      });
      throw new Error("Unexpected Jira projects response shape");
    }
    const projects = listParsed.data.map((p) =>
      jiraProjectSchema.parse({
        id: String(p.id),
        key: p.key,
        name: p.name,
      }),
    );
    return { projects, agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("getProjects failed", { message, stack });
    throw error;
  }
}

export async function addComment(
  issueKey: string,
  body: string,
): Promise<{ agentLog: AgentLogEntry[] }> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const encoded = encodeURIComponent(issueKey);
    const { log } = await jiraRestJson({
      toolName: "jira_add_comment",
      method: "POST",
      path: `/rest/api/3/issue/${encoded}/comment`,
      body: { body: plainTextToAdf(body) },
    });
    agentLog.push(log);
    return { agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("addComment failed", { message, stack });
    throw error;
  }
}
