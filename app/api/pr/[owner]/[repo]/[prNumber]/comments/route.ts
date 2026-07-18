import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";
import type { GitHubPRComment } from "@/types/github";

interface RouteParams {
  params: Promise<{ owner: string; repo: string; prNumber: string }>;
}

// GET /api/pr/[owner]/[repo]/[prNumber]/comments
// Fetches all review comments for the PR from GitHub.
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
    const comments = await githubFetch<GitHubPRComment[]>(
      `/repos/${owner}/${repo}/pulls/${prNumParsed}/comments?per_page=100`,
      session.accessToken
    );
    return NextResponse.json(comments);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// POST /api/pr/[owner]/[repo]/[prNumber]/comments
// Posts a new review comment or replies to an existing thread.
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const bodyJson = await request.json();
    const { body, commit_id, path, line, side, start_line, start_side, in_reply_to_id } = bodyJson;

    if (!body || typeof body !== "string" || body.trim() === "") {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    const payload: Record<string, string | number> = { body };

    if (in_reply_to_id !== undefined) {
      // Replying to an existing thread
      const replyToIdParsed = parseInt(in_reply_to_id, 10);
      if (isNaN(replyToIdParsed)) {
        return NextResponse.json({ error: "Invalid in_reply_to_id" }, { status: 400 });
      }
      payload.in_reply_to_id = replyToIdParsed;
    } else {
      // Starting a new thread
      if (!commit_id || !path || line === undefined || !side) {
        return NextResponse.json({ error: "Missing required fields for new comment thread" }, { status: 400 });
      }
      payload.commit_id = commit_id;
      payload.path = path;
      payload.line = parseInt(line, 10);
      payload.side = side;

      if (start_line !== undefined && start_line !== null) {
        payload.start_line = parseInt(start_line, 10);
        payload.start_side = start_side || side; // Default to main side if start_side omitted
      }
    }

    const createdComment = await githubFetch<GitHubPRComment>(
      `/repos/${owner}/${repo}/pulls/${prNumParsed}/comments`,
      session.accessToken,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.github+json",
        },
        body: JSON.stringify(payload),
      }
    );

    return NextResponse.json(createdComment);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
