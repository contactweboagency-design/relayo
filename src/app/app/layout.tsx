import { requireUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar username={user.account?.username ?? "compte"} demo={user.account?.isDemo ?? true} />
      <main className="min-w-0 flex-1 md:h-screen md:overflow-y-auto">{children}</main>
    </div>
  );
}
