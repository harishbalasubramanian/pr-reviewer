import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

// POST (not GET) — logout mutates state. A GET endpoint would allow third-party
// pages to log out the user just by embedding an <img> with this URL.
export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`);
}
