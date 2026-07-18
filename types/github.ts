// Subset of the GitHub Pull Request API response we actually use.
// Kept narrow intentionally — only add fields here when a feature needs them.

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  merged: boolean;
  mergeable: boolean | null; // null = GitHub hasn't computed mergeability yet (it's async)
  mergeable_state: string;   // "dirty" = conflicts; "clean" = ok to merge
  head: {
    sha: string;
    ref: string; // branch name
    repo: { full_name: string } | null;
  };
  base: {
    ref: string;
    repo: { full_name: string };
  };
  user: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
}
