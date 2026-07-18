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

    if (in_reply_to_id !== undefined) {
      // Replying to an existing thread using the dedicated endpoint:
      // POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/replies
      const replyToIdParsed = parseInt(in_reply_to_id, 10);
      if (isNaN(replyToIdParsed)) {
        return NextResponse.json({ error: "Invalid in_reply_to_id" }, { status: 400 });
      }

      const createdComment = await githubFetch<GitHubPRComment>(
        `/repos/${owner}/${repo}/pulls/${prNumParsed}/comments/${replyToIdParsed}/replies`,
        session.accessToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/vnd.github+json",
          },
          body: JSON.stringify({ body }),
        }
      );

      return NextResponse.json(createdComment);
    } else {
      // Starting a new thread:
      // POST /repos/{owner}/{repo}/pulls/{pull_number}/comments
      if (!commit_id || !path || line === undefined || !side) {
        return NextResponse.json({ error: "Missing required fields for new comment thread" }, { status: 400 });
      }

      const payload: Record<string, string | number> = {
        body,
        commit_id,
        path,
        line: parseInt(line, 10),
        side,
      };

      if (start_line !== undefined && start_line !== null) {
        payload.start_line = parseInt(start_line, 10);
        payload.start_side = start_side || side; // Default to main side if start_side omitted
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
    }
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// PATCH /api/pr/[owner]/[repo]/[prNumber]/comments
// Edits an existing review comment.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { owner, repo } = await params;

  try {
    const bodyJson = await request.json();
    const { comment_id, body } = bodyJson;

    if (!comment_id || !body || typeof body !== "string" || body.trim() === "") {
      return NextResponse.json({ error: "Comment ID and body are required" }, { status: 400 });
    }

    const updatedComment = await githubFetch<GitHubPRComment>(
      `/repos/${owner}/${repo}/pulls/comments/${comment_id}`,
      session.accessToken,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/vnd.github+json",
        },
        body: JSON.stringify({ body }),
      }
    );

    return NextResponse.json(updatedComment);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// DELETE /api/pr/[owner]/[repo]/[prNumber]/comments
// Deletes an existing review comment.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { owner, repo } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const comment_id = searchParams.get("comment_id");

    if (!comment_id) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    await githubFetch<void>(
      `/repos/${owner}/${repo}/pulls/comments/${comment_id}`,
      session.accessToken,
      {
        method: "DELETE",
      }
    );

    return new NextResponse(null, { status: 204 }); // 204 No Content is standard for delete success
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

