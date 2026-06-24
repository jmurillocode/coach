"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Today", icon: "◎" },
  { href: "/training", label: "Training", icon: "🏃" },
  { href: "/nutrition", label: "Nutrition", icon: "🍎" },
  { href: "/coach", label: "Coach", icon: "💬" },
  { href: "/history", label: "History", icon: "≣" },
];

export function BottomNav() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-edge bg-ink/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
