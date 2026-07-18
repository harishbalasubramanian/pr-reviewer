import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// Redirects the user to GitHub's OAuth consent screen.
// A random `state` nonce is set in a short-lived cookie to prevent CSRF on the callback.
export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: "repo",
    state,
  });

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes — enough for the user to authorize on GitHub
    path: "/",
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`
  );
}
