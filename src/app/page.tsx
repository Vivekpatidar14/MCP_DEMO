import { DashboardClient } from "@/components/home/DashboardClient";
import { env } from "@/env";

export default function Home() {
  return <DashboardClient jiraBaseUrl={env.JIRA_BASE_URL} />;
}
