import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { githubFetch, GitHubApiError } from "@/lib/github";

const ERROR_REDIRECT = `${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`;

interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
  error?: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

// Handles the redirect back from GitHub after the user authorizes (or denies) the OAuth app.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  // Clear the state cookie regardless of outcome.
  cookieStore.delete("oauth_state");

  // Reject if state is missing or doesn't match — could be a CSRF attempt.
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(ERROR_REDIRECT);
  }

  // Exchange the authorization code for an access token.
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      }),
    }
  );

  const tokenData: GitHubTokenResponse = await tokenResponse.json();

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(ERROR_REDIRECT);
  }

  // Fetch the user's profile to confirm the token works and get their username.
  let user: GitHubUser;
  try {
    user = await githubFetch<GitHubUser>("/user", tokenData.access_token);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.redirect(ERROR_REDIRECT);
    }
    throw err;
  }

  // Write the session. iron-session encrypts this into the cookie before sending.
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.accessToken = tokenData.access_token;
  session.login = user.login;
  session.avatarUrl = user.avatar_url;
  await session.save();

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
}
