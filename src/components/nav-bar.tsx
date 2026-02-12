"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarIcon, MenuBookIcon, LightbulbIcon, GroupIcon } from "./icons";

const navItems = [
  { href: "/", label: "Wochenplan", Icon: CalendarIcon },
  { href: "/rezepte", label: "Rezepte", Icon: MenuBookIcon },
  { href: "/inspiration", label: "Inspiration", Icon: LightbulbIcon },
  { href: "/familie", label: "Familie", Icon: GroupIcon },
];

export function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-bold text-primary">Essensplaner</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-muted hover:text-foreground"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  isActive
                    ? "font-medium text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <item.Icon className="h-6 w-6" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
