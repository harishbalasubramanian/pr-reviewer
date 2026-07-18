import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { sessionOptions, type SessionData } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";
import type { GitHubPullRequest } from "@/types/github";
import PRViewerPage from "@/components/PRViewerPage";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface PageProps {
  params: Promise<{ owner: string; repo: string; prNumber: string }>;
}

export default async function PRPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    redirect("/");
  }

  const { owner, repo, prNumber } = await params;

  let pr: GitHubPullRequest;
  try {
    pr = await githubFetch<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${prNumber}`,
      session.accessToken
    );
  } catch (err) {
    if (err instanceof GitHubApiError && (err.status === 403 || err.status === 404)) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            PR not found or you don&apos;t have access.
          </Typography>
        </Box>
      );
    }
    throw err;
  }

  return (
    <PRViewerPage
      owner={owner}
      repo={repo}
      prNumber={parseInt(prNumber, 10)}
      pr={pr}
      userLogin={session.login}
      userAvatarUrl={session.avatarUrl}
    />
  );
}
