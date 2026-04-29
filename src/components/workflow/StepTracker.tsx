"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkflowStepId } from "@/types/workflow.types";

export interface StepTrackerProps {
  activeStep: WorkflowStepId;
  /** Spinners only while these in-flight actions match the active step */
  isFetchingTicket: boolean;
  isAnalysing: boolean;
  isCreatingPr: boolean;
  isRepoLoading: boolean;
  isUpdatingJira: boolean;
}

const STEPS: { id: WorkflowStepId; label: string; hint: string }[] = [
  {
    id: "fetch_ticket",
    label: "Fetch ticket",
    hint: "Jira MCP reads the issue",
  },
  {
    id: "analyse",
    label: "Analyse",
    hint: "Branch + PR copy drafted",
  },
  {
    id: "create_pr",
    label: "Create PR",
    hint: "GitHub MCP opens a draft PR",
  },
  { id: "done", label: "Done", hint: "Optional Jira comment" },
];

function stepIndex(id: WorkflowStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

function stepInFlight(
  stepId: WorkflowStepId,
  activeStep: WorkflowStepId,
  flags: Pick<
    StepTrackerProps,
    | "isFetchingTicket"
    | "isAnalysing"
    | "isCreatingPr"
    | "isRepoLoading"
    | "isUpdatingJira"
  >,
): boolean {
  if (stepId !== activeStep) return false;
  switch (stepId) {
    case "fetch_ticket":
      return flags.isFetchingTicket;
    case "analyse":
      return flags.isAnalysing;
    case "create_pr":
      return flags.isCreatingPr || flags.isRepoLoading;
    case "done":
      return flags.isUpdatingJira;
  }
}

export function StepTracker({
  activeStep,
  isFetchingTicket,
  isAnalysing,
  isCreatingPr,
  isRepoLoading,
  isUpdatingJira,
}: StepTrackerProps) {
  const current = stepIndex(activeStep);
  const flags = {
    isFetchingTicket,
    isAnalysing,
    isCreatingPr,
    isRepoLoading,
    isUpdatingJira,
  };

  return (
    <Card className="border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workflow</CardTitle>
        <CardDescription>
          Four-step agent journey from Jira context to GitHub, instrumented for
          live demos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const complete = index < current;
            const active = index === current;
            const busy = stepInFlight(step.id, activeStep, flags);
            return (
              <li
                key={step.id}
                className={cn(
                  "relative flex flex-col gap-1 rounded-xl border p-3 transition-colors",
                  complete &&
                    "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-500/10",
                  active &&
                    "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20 dark:border-blue-400/40 dark:bg-blue-500/10",
                  !complete &&
                    !active &&
                    "border-dashed border-border/80 bg-muted/20 opacity-80",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
                      complete &&
                        "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-500",
                      active &&
                        "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500",
                      !complete &&
                        !active &&
                        "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {complete ? (
                      <Check className="size-4" aria-hidden />
                    ) : active && busy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Circle className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="text-sm font-semibold">{step.label}</span>
                </div>
                <p className="pl-10 text-xs text-muted-foreground">{step.hint}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
