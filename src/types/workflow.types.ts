import { z } from "zod";

export const workflowStepIdSchema = z.enum([
  "fetch_ticket",
  "analyse",
  "create_pr",
  "done",
]);
export type WorkflowStepId = z.infer<typeof workflowStepIdSchema>;

export const workflowStepStatusSchema = z.enum([
  "pending",
  "active",
  "complete",
  "error",
]);
export type WorkflowStepStatus = z.infer<typeof workflowStepStatusSchema>;

export const ticketAnalysisSchema = z.object({
  branchName: z.string(),
  prTitle: z.string(),
  prBody: z.string(),
});
export type TicketAnalysis = z.infer<typeof ticketAnalysisSchema>;
