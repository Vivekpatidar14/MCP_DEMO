import { z } from "zod";

export const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  private: z.boolean().optional(),
  defaultBranch: z.string().optional(),
});
export type GitHubRepo = z.infer<typeof githubRepoSchema>;

const githubRepoLooseSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string().optional(),
  private: z.boolean().optional(),
  defaultBranch: z.string().optional(),
});

/** Normalizes API JSON that may only include `name` and `fullName`. */
export function parseGitHubRepoJson(raw: unknown): GitHubRepo {
  const loose = githubRepoLooseSchema.safeParse(raw);
  if (!loose.success) {
    return githubRepoSchema.parse(raw);
  }
  const r = loose.data;
  const slash = r.fullName.indexOf("/");
  const inferredOwner =
    slash > 0 ? r.fullName.slice(0, Math.max(0, slash)) : "";
  return githubRepoSchema.parse({
    id: r.id ?? 0,
    name: r.name,
    fullName: r.fullName,
    owner: r.owner ?? inferredOwner,
    private: r.private,
    defaultBranch: r.defaultBranch,
  });
}

export const githubPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  htmlUrl: z.string().url(),
  state: z.string().optional(),
  draft: z.boolean().optional(),
  headRef: z.string().optional(),
  baseRef: z.string().optional(),
});
export type GitHubPullRequest = z.infer<typeof githubPullRequestSchema>;
