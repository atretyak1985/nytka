"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/meetings", label: "Meetings" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b px-6 py-3 flex items-center gap-6">
      <span className="font-semibold">Nytka</span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "text-sm text-muted-foreground hover:text-foreground",
            pathname.startsWith(l.href) && "text-foreground font-medium",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
