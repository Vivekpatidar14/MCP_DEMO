import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { GitHubPullRequest, GitHubRepo } from "@/types/github.types";
import { githubPullRequestSchema, githubRepoSchema } from "@/types/github.types";
import type { AgentLogEntry } from "@/lib/mcp/types";
import { createLogEntry, logToolCall } from "@/lib/mcp/types";

const GITHUB_API = "https://api.github.com";

const githubRepoApiSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean().optional(),
  default_branch: z.string().optional(),
  owner: z.object({ login: z.string() }),
});

const githubRepoListSchema = z.array(githubRepoApiSchema);

const gitRefSchema = z.object({
  object: z.object({ sha: z.string() }),
});

const gitCommitDetailSchema = z.object({
  sha: z.string(),
  tree: z.object({ sha: z.string() }),
  parents: z.array(z.object({ sha: z.string() })),
});

const pullRequestRestSchema = z
  .object({
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
    draft: z.boolean().optional(),
    state: z.string().optional(),
    head: z.object({ ref: z.string() }).optional(),
    base: z.object({ ref: z.string() }).optional(),
  })
  .passthrough();

const repoDetailSchema = z.object({
  default_branch: z.string().optional(),
});

function githubHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_PAT}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function parsePullRequest(raw: unknown): GitHubPullRequest {
  const parsed = pullRequestRestSchema.safeParse(raw);
  if (!parsed.success) {
    return githubPullRequestSchema.parse({
      number: 0,
      title: "(parse error)",
      htmlUrl: "https://github.com",
      draft: true,
    });
  }
  const p = parsed.data;
  return githubPullRequestSchema.parse({
    number: p.number,
    title: p.title,
    htmlUrl: p.html_url,
    state: p.state,
    draft: p.draft,
    headRef: p.head?.ref,
    baseRef: p.base?.ref,
  });
}

async function githubRestJson(options: {
  toolName: string;
  method: string;
  path: string;
  body?: unknown;
}): Promise<{ json: unknown; log: AgentLogEntry }> {
  const url = `${GITHUB_API}${options.path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: options.method,
      headers: {
        ...githubHeaders(),
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
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
      const detail = (() => {
        if (typeof parsed !== "object" || parsed === null) {
          return text.slice(0, 500);
        }
        const o = parsed as {
          message?: string;
          errors?: Array<{ message?: string; code?: string; field?: string }>;
        };
        if (o.errors && o.errors.length > 0) {
          return `${o.message ?? "GitHub error"}: ${JSON.stringify(o.errors)}`;
        }
        if (typeof o.message === "string") {
          return o.message;
        }
        return text.slice(0, 500);
      })();
      const err = new Error(`GitHub REST ${res.status}: ${detail}`);
      logger.error("GitHub REST request failed", {
        message: err.message,
        stack: err.stack,
        toolName: options.toolName,
        toolCall: logToolCall({
          toolName: options.toolName,
          endpoint: url,
          method: options.method,
          httpStatus: res.status,
          durationMs,
          summary: `GitHub API error ${res.status}`,
          errorDetail: detail,
        }),
      });
      throw err;
    }

    const summary =
      options.toolName === "github_list_repos"
        ? "repository list"
        : options.toolName === "github_get_ref"
          ? "resolved base ref"
          : options.toolName === "github_create_ref"
            ? "branch ref created"
            : options.toolName === "github_get_commit"
              ? "commit metadata"
              : options.toolName === "github_create_commit"
                ? "commit created"
                : options.toolName === "github_update_ref"
                  ? "branch ref updated"
                  : options.toolName === "github_create_pull_request"
                    ? "pull request created"
                    : options.toolName === "github_add_issue_labels"
                      ? "labels applied"
                      : options.toolName === "github_get_repo"
                        ? "repository metadata"
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
    if (error instanceof Error && error.message.startsWith("GitHub REST")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("GitHub REST transport error", { message, stack });
    throw Object.assign(new Error(message), { cause: error });
  }
}

export async function listRepos(): Promise<{
  repos: GitHubRepo[];
  agentLog: AgentLogEntry[];
}> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const { json, log } = await githubRestJson({
      toolName: "github_list_repos",
      method: "GET",
      path: `/user/repos?per_page=100&sort=updated`,
    });
    agentLog.push(log);
    const parsed = githubRepoListSchema.safeParse(json);
    if (!parsed.success) {
      logger.error("Unexpected GitHub repo list", {
        issues: parsed.error.flatten(),
      });
      throw new Error("Unexpected GitHub /user/repos response shape");
    }
    const owner = env.GITHUB_DEFAULT_OWNER;
    const repos = parsed.data
      .filter((r) => r.owner.login === owner)
      .map((item) =>
        githubRepoSchema.parse({
          id: item.id,
          name: item.name,
          fullName: item.full_name,
          owner: item.owner.login,
          private: item.private,
          defaultBranch: item.default_branch,
        }),
      );
    return { repos, agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("listRepos failed", { message, stack });
    throw error;
  }
}

export async function getDefaultBranch(
  owner: string,
  repo: string,
): Promise<{ defaultBranch: string; agentLog: AgentLogEntry[] }> {
  const agentLog: AgentLogEntry[] = [];
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const { json, log } = await githubRestJson({
    toolName: "github_get_repo",
    method: "GET",
    path,
  });
  agentLog.push(log);
  const parsed = repoDetailSchema.safeParse(json);
  const defaultBranch = parsed.success
    ? (parsed.data.default_branch ?? "main")
    : "main";
  return { defaultBranch, agentLog };
}

export async function createBranch(input: {
  owner: string;
  repo: string;
  branch: string;
  fromBranch?: string;
}): Promise<{ agentLog: AgentLogEntry[] }> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const baseRef = input.fromBranch ?? "main";
    const refPath = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/ref/heads/${encodeURIComponent(baseRef)}`;
    const refRes = await githubRestJson({
      toolName: "github_get_ref",
      method: "GET",
      path: refPath,
    });
    agentLog.push(refRes.log);
    const refParsed = gitRefSchema.safeParse(refRes.json);
    if (!refParsed.success) {
      logger.error("Unexpected git ref response", {
        issues: refParsed.error.flatten(),
      });
      throw new Error("Could not resolve base branch SHA");
    }
    const sha = refParsed.data.object.sha;

    const createPath = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs`;
    try {
      const { log } = await githubRestJson({
        toolName: "github_create_ref",
        method: "POST",
        path: createPath,
        body: {
          ref: `refs/heads/${input.branch}`,
          sha,
        },
      });
      agentLog.push(log);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already exists")) {
        agentLog.push(
          createLogEntry({
            toolName: "github_create_ref",
            status: "success",
            payload: {
              skipped: true,
              summary: "Branch ref already exists; continuing",
            },
          }),
        );
      } else {
        throw error;
      }
    }
    return { agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("createBranch failed", { message, stack });
    throw error;
  }
}

/** Adds an empty commit so `base..head` is non-empty (GitHub rejects PRs with identical trees). */
export async function appendEmptyCommitOnBranch(input: {
  owner: string;
  repo: string;
  branch: string;
}): Promise<{ agentLog: AgentLogEntry[] }> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const refPath = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/ref/heads/${encodeURIComponent(input.branch)}`;
    const refRes = await githubRestJson({
      toolName: "github_get_ref",
      method: "GET",
      path: refPath,
    });
    agentLog.push(refRes.log);
    const tipSha = gitRefSchema.parse(refRes.json).object.sha;

    const commitRes = await githubRestJson({
      toolName: "github_get_commit",
      method: "GET",
      path: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/commits/${tipSha}`,
    });
    agentLog.push(commitRes.log);
    const detail = gitCommitDetailSchema.safeParse(commitRes.json);
    if (!detail.success) {
      logger.error("Unexpected git commit shape", {
        issues: detail.error.flatten(),
      });
      throw new Error("Could not read commit metadata for empty append");
    }
    const treeSha = detail.data.tree.sha;

    const newCommitRes = await githubRestJson({
      toolName: "github_create_commit",
      method: "POST",
      path: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/commits`,
      body: {
        message: "chore: draft branch for ticket-to-pr-demo",
        tree: treeSha,
        parents: [tipSha],
      },
    });
    agentLog.push(newCommitRes.log);
    const newSha = z.object({ sha: z.string() }).parse(newCommitRes.json).sha;

    const patchPath = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs/heads/${encodeURIComponent(input.branch)}`;
    const patchRes = await githubRestJson({
      toolName: "github_update_ref",
      method: "PATCH",
      path: patchPath,
      body: { sha: newSha },
    });
    agentLog.push(patchRes.log);
    return { agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("appendEmptyCommitOnBranch failed", { message, stack });
    throw error;
  }
}

export async function createPR(input: {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}): Promise<{ pr: GitHubPullRequest; agentLog: AgentLogEntry[] }> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const path = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`;
    const { json, log } = await githubRestJson({
      toolName: "github_create_pull_request",
      method: "POST",
      path,
      body: {
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
        draft: input.draft ?? true,
      },
    });
    agentLog.push(log);
    const pr = parsePullRequest(json);
    return { pr, agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("createPR failed", { message, stack });
    throw error;
  }
}

export async function addLabel(input: {
  owner: string;
  repo: string;
  issueNumber: number;
  labels: string[];
}): Promise<{ agentLog: AgentLogEntry[] }> {
  const agentLog: AgentLogEntry[] = [];
  try {
    const path = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issueNumber}/labels`;
    const { log } = await githubRestJson({
      toolName: "github_add_issue_labels",
      method: "POST",
      path,
      body: { labels: input.labels },
    });
    agentLog.push(log);
    return { agentLog };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("addLabel failed", { message, stack });
    throw error;
  }
}
