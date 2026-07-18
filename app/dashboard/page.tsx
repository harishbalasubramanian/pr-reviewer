import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { sessionOptions, type SessionData } from "@/lib/session";
import DashboardPage from "@/components/DashboardPage";

// Server Component — guards the route. Unauthenticated users go back to the landing page.
export default async function Dashboard() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.login) {
    redirect("/");
  }

  return (
    <DashboardPage login={session.login} avatarUrl={session.avatarUrl} />
  );
}
