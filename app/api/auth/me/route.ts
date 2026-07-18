import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

// Returns the current user's public profile from the session, or 401 if not signed in.
// The access token is intentionally not included — client code should never see it.
export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.login) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    login: session.login,
    avatarUrl: session.avatarUrl,
  });
}
