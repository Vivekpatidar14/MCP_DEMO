"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { WorkflowPanel } from "@/components/workflow/WorkflowPanel";
import { useWorkflowStore } from "@/store/workflow.store";

export interface DashboardClientProps {
  jiraBaseUrl: string;
}

export function DashboardClient({ jiraBaseUrl }: DashboardClientProps) {
  const resetDemo = useWorkflowStore((s) => s.resetDemo);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onResetDemo={resetDemo} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8">
            <WorkflowPanel jiraBaseUrl={jiraBaseUrl} />
          </div>
        </main>
      </div>
    </div>
  );
}
