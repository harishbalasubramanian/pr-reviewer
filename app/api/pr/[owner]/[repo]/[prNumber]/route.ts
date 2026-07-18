import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";
import type { GitHubPullRequest } from "@/types/github";

interface RouteParams {
  params: Promise<{ owner: string; repo: string; prNumber: string }>;
}

// Access check and metadata fetch for a single PR.
// Used by the entry form to validate access before navigating to the PR viewer page.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { owner, repo, prNumber } = await params;

  const prNumParsed = parseInt(prNumber, 10);
  if (isNaN(prNumParsed) || prNumParsed <= 0) {
    return NextResponse.json({ error: "Invalid PR number" }, { status: 400 });
  }

  try {
    const pr = await githubFetch<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${prNumParsed}`,
      session.accessToken
    );
    return NextResponse.json(pr);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      // Surface 403/404 directly — the form uses these to show access-denied vs not-found.
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
