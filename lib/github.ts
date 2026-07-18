// Central wrapper for all GitHub API calls.
// Handles auth headers and maps non-2xx responses to a typed error so callers
// don't have to check response.ok everywhere.

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export async function githubFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GitHubApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}
