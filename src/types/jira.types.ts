import { z } from "zod";

export const jiraUserSchema = z.object({
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
  accountId: z.string().optional(),
});
export type JiraUser = z.infer<typeof jiraUserSchema>;

export const jiraTicketSchema = z.object({
  id: z.string(),
  key: z.string(),
  summary: z.string(),
  description: z.string().nullable().optional(),
  acceptanceCriteria: z.string().nullable().optional(),
  assignee: jiraUserSchema.nullable().optional(),
  priority: z.string().nullable().optional(),
  status: z.string().optional(),
  projectKey: z.string().optional(),
});
export type JiraTicket = z.infer<typeof jiraTicketSchema>;

const jiraTicketFromApiSchema = z.preprocess((val) => {
  if (!val || typeof val !== "object") {
    return val;
  }
  const o = { ...(val as Record<string, unknown>) };
  if (typeof o.id !== "string") {
    o.id = typeof o.key === "string" ? o.key : String(o.id ?? "");
  }
  return o;
}, jiraTicketSchema);

/** Accepts ticket JSON where `id` may be omitted (coerced from `key`). */
export function parseJiraTicketJson(raw: unknown): JiraTicket {
  return jiraTicketFromApiSchema.parse(raw);
}

export const jiraProjectSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
});
export type JiraProject = z.infer<typeof jiraProjectSchema>;
