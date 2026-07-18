import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { sessionOptions, type SessionData } from "@/lib/session";
import LandingPage from "@/components/LandingPage";

// Server Component — checks session before rendering.
// If the user is already signed in, skip the landing page entirely.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.login) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const authFailed = error === "auth_failed";

  return <LandingPage authFailed={authFailed} />;
}
