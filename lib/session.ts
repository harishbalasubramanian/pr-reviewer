import type { SessionOptions } from "iron-session";
import type { SessionData } from "@/types/session";

// Single place for iron-session config — imported by every route that reads/writes the session.
export const sessionOptions: SessionOptions = {
  cookieName: "pr-reviewer-session",
  // SESSION_SECRET must be at least 32 chars; iron-session will throw at runtime if not.
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// Re-export the session type here so callers only need one import.
export type { SessionData };
