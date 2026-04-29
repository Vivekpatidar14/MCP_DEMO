import { z } from "zod";

export const mcpLogStatusSchema = z.enum(["pending", "success", "error"]);
export type McpLogStatus = z.infer<typeof mcpLogStatusSchema>;

export const agentLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  toolName: z.string(),
  status: mcpLogStatusSchema,
  payload: z.unknown().optional(),
  errorMessage: z.string().optional(),
});
export type AgentLogEntry = z.infer<typeof agentLogEntrySchema>;

export const agentLogResponseSchema = z.array(agentLogEntrySchema);
export type AgentLogResponse = z.infer<typeof agentLogResponseSchema>;

export function createLogEntry(input: {
  toolName: string;
  status: McpLogStatus;
  payload?: unknown;
  errorMessage?: string;
}): AgentLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    toolName: input.toolName,
    status: input.status,
    payload: input.payload,
    errorMessage: input.errorMessage,
  };
}

/** Structured REST call visibility for AgentLog (replaces MCP tool-result payloads). */
export function logToolCall(input: {
  toolName: string;
  endpoint: string;
  method: string;
  httpStatus: number;
  durationMs: number;
  summary: string;
  errorDetail?: string;
}): AgentLogEntry {
  const ok = input.httpStatus >= 200 && input.httpStatus < 400 && !input.errorDetail;
  return createLogEntry({
    toolName: input.toolName,
    status: ok ? "success" : "error",
    payload: {
      endpoint: input.endpoint,
      method: input.method,
      httpStatus: input.httpStatus,
      durationMs: input.durationMs,
      summary: input.summary,
    },
    errorMessage: input.errorDetail,
  });
}
