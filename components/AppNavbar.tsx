"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  DollarSign,
  Utensils,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

interface AppNavbarProps {
  userEmail?: string | null;
}

export function AppNavbar({ userEmail }: AppNavbarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Learning Studio", href: "/dashboard/learnings", icon: BookOpen },
    { name: "Finance", href: "/dashboard/finance", icon: DollarSign },
    { name: "Diet", href: "/dashboard/diet", icon: Utensils },
  ];

  const username = userEmail ? userEmail.split("@")[0] : "user";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-black/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold text-xs tracking-tight shadow-xs">
              L
            </div>
            <span className="text-sm font-semibold tracking-tight text-black dark:text-white">
              Life OS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span className="truncate max-w-[120px] sm:max-w-none">{username}</span>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 gap-1.5 overflow-x-auto bg-zinc-50 dark:bg-zinc-950">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                isActive
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="h-3 w-3" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
