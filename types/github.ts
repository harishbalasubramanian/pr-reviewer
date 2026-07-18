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

export interface GitHubPRFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;    // unified diff; absent for binary files or very large diffs
  blob_url: string;  // link to the file on GitHub
  sha: string;
}

export interface GitHubPRComment {
  id: number;
  pull_request_review_id: number | null;
  diff_hunk: string;
  path: string;
  position: number | null;
  original_position: number | null;
  commit_id: string;
  original_commit_id: string;
  in_reply_to_id?: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  line: number | null;
  original_line: number | null;
  side: "LEFT" | "RIGHT" | null;
  start_line: number | null;
  original_start_line: number | null;
  start_side: "LEFT" | "RIGHT" | null;
}

export interface CommentSelectionRange {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  start_line: number | null;
  start_side: "LEFT" | "RIGHT" | null;
  startIndex: number;
  endIndex: number;
}


