import Link from "next/link";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { logOut } from "./actions";

export function PortalNav({ active }: { active: "overview" | "profile" }) {
  const tab = (on: boolean) =>
    cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors", on ? "bg-ink text-white" : "text-muted hover:bg-black/[0.05] hover:text-fg");
  return (
    <nav aria-label="Portal" className="flex flex-wrap items-center gap-1.5">
      <Link href="/account" className={tab(active === "overview")} aria-current={active === "overview" ? "page" : undefined}>
        <LayoutDashboard className="h-4 w-4" aria-hidden /> Overview
      </Link>
      <Link href="/account/profile" className={tab(active === "profile")} aria-current={active === "profile" ? "page" : undefined}>
        <UserRound className="h-4 w-4" aria-hidden /> Profile &amp; security
      </Link>
      <form action={logOut} className="ml-auto">
        <button type="submit" className={tab(false)}>
          <LogOut className="h-4 w-4" aria-hidden /> Log out
        </button>
      </form>
    </nav>
  );
}
