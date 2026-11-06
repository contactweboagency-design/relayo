"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, LayoutDashboard, LogOut, Settings, Users, Workflow } from "lucide-react";
import { Logo } from "../Logo";

const NAV = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/app/automations", label: "Scénarios", icon: Workflow },
  { href: "/app/contacts", label: "Contacts", icon: Users },
  { href: "/app/simulator", label: "Simulateur", icon: FlaskConical },
  { href: "/app/settings", label: "Réglages", icon: Settings },
];

export function Sidebar({ username, demo }: { username: string; demo: boolean }) {
  const path = usePathname();
  return (
    <aside className="flex shrink-0 flex-col border-slate-200 bg-ink text-slate-300 md:h-screen md:w-60 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:block">
        <Logo className="text-white" />
        <div className="mt-0 text-xs md:mt-4">
          <span className="text-slate-400">@{username}</span>
          {demo && <span className="badge ml-2 bg-amber-400/20 text-amber-300">démo</span>}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:pb-0">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/logout" method="post" className="hidden p-2 md:block">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </form>
    </aside>
  );
}
