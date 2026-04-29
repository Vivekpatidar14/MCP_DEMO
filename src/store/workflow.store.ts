import { create } from "zustand";
import type { AgentLogEntry } from "@/lib/mcp/types";
import type { GitHubPullRequest, GitHubRepo } from "@/types/github.types";
import type { JiraTicket } from "@/types/jira.types";
import type { TicketAnalysis } from "@/types/workflow.types";
import type { WorkflowStepId } from "@/types/workflow.types";

export interface WorkflowState {
  activeStep: WorkflowStepId;
  ticket: JiraTicket | null;
  analysis: TicketAnalysis | null;
  selectedRepo: GitHubRepo | null;
  pr: GitHubPullRequest | null;
  agentLog: AgentLogEntry[];
  ticketInput: string;
  isFetchingTicket: boolean;
  isAnalysing: boolean;
  isCreatingPr: boolean;
  isUpdatingJira: boolean;
  setTicketInput: (value: string) => void;
  setActiveStep: (step: WorkflowStepId) => void;
  setTicket: (ticket: JiraTicket | null) => void;
  setAnalysis: (analysis: TicketAnalysis | null) => void;
  patchAnalysis: (patch: Partial<TicketAnalysis>) => void;
  setSelectedRepo: (repo: GitHubRepo | null) => void;
  setPr: (pr: GitHubPullRequest | null) => void;
  appendAgentLog: (entries: AgentLogEntry[]) => void;
  clearAgentLog: () => void;
  setLoading: (
    key:
      | "isFetchingTicket"
      | "isAnalysing"
      | "isCreatingPr"
      | "isUpdatingJira",
    value: boolean,
  ) => void;
  resetDemo: () => void;
}

const initialState = {
  activeStep: "fetch_ticket" as WorkflowStepId,
  ticket: null as JiraTicket | null,
  analysis: null as TicketAnalysis | null,
  selectedRepo: null as GitHubRepo | null,
  pr: null as GitHubPullRequest | null,
  agentLog: [] as AgentLogEntry[],
  ticketInput: "",
  isFetchingTicket: false,
  isAnalysing: false,
  isCreatingPr: false,
  isUpdatingJira: false,
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  ...initialState,
  setTicketInput: (ticketInput) => set({ ticketInput }),
  setActiveStep: (activeStep) => set({ activeStep }),
  setTicket: (ticket) => set({ ticket }),
  setAnalysis: (analysis) => set({ analysis }),
  patchAnalysis: (patch) =>
    set((s) =>
      s.analysis ? { analysis: { ...s.analysis, ...patch } } : {},
    ),
  setSelectedRepo: (selectedRepo) => set({ selectedRepo }),
  setPr: (pr) => set({ pr }),
  appendAgentLog: (entries) =>
    set((s) => ({ agentLog: [...s.agentLog, ...entries] })),
  clearAgentLog: () => set({ agentLog: [] }),
  setLoading: (key, value) => set({ [key]: value }),
  resetDemo: () => set({ ...initialState }),
}));
