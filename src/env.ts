import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const skip =
  process.env.SKIP_ENV_VALIDATION === "1" ||
  process.env.SKIP_ENV_VALIDATION === "true";

function buildPlaceholder<T extends string>(value: unknown, fallback: T): T {
  if (typeof value === "string" && value.trim() !== "") {
    return value as T;
  }
  return skip ? fallback : (value as T);
}

/** Use documented default endpoints when unset (optional overrides in .env.local.example). */
function defaultUrl(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return fallback;
}

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    JIRA_API_TOKEN: z.preprocess(
      (v) => buildPlaceholder(v, "build-placeholder-jira-token"),
      z.string().min(1),
    ),
    JIRA_BASE_URL: z.preprocess(
      (v) => buildPlaceholder(v, "https://example.atlassian.net"),
      z.string().url(),
    ),
    JIRA_USER_EMAIL: z.preprocess(
      (v) => buildPlaceholder(v, "demo@example.com"),
      z.string().email(),
    ),
    JIRA_CLOUD_ID: z.string().min(1).optional(),
    GITHUB_PAT: z.preprocess(
      (v) => buildPlaceholder(v, "build-placeholder-github-pat"),
      z.string().min(1),
    ),
    GITHUB_DEFAULT_OWNER: z.preprocess(
      (v) => buildPlaceholder(v, "octocat"),
      z.string().min(1),
    ),
    JIRA_MCP_URL: z.preprocess(
      (v) => defaultUrl(v, "https://mcp.atlassian.com/v1/mcp"),
      z.string().url(),
    ),
    GITHUB_MCP_URL: z.preprocess(
      (v) => defaultUrl(v, "https://api.githubcopilot.com/mcp/"),
      z.string().url(),
    ),
    JIRA_MCP_TOOL_GET_ISSUE: z.string().min(1).optional(),
    JIRA_MCP_TOOL_LIST_PROJECTS: z.string().min(1).optional(),
    JIRA_MCP_TOOL_ADD_COMMENT: z.string().min(1).optional(),
    JIRA_MCP_TOOL_CLOUD_DISCOVERY: z.string().min(1).optional(),
    GITHUB_MCP_TOOL_SEARCH_REPOS: z.string().min(1).optional(),
    GITHUB_MCP_TOOL_CREATE_BRANCH: z.string().min(1).optional(),
    GITHUB_MCP_TOOL_CREATE_PR: z.string().min(1).optional(),
    GITHUB_MCP_TOOL_ISSUE_WRITE: z.string().min(1).optional(),
  },
  client: {},
  experimental__runtimeEnv: process.env,
  skipValidation: skip,
});
