import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";
import type { GitHubPRFile } from "@/types/github";

interface RouteParams {
  params: Promise<{ owner: string; repo: string; prNumber: string }>;
}

// Returns the list of files changed in a PR.
// Used by the manual refresh button in PR 6 to re-fetch without a full page reload.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { owner, repo, prNumber } = await params;

  try {
    const files = await githubFetch<GitHubPRFile[]>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
      session.accessToken
    );
    return NextResponse.json(files);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 403 || err.status === 404) {
        return NextResponse.json(
          { error: "PR not found or you don't have access." },
          { status: err.status }
        );
      }
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
