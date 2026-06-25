"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/daily",    label: "Günlük",  icon: "✦" },
  { href: "/okuma",    label: "Okuma",   icon: "⊹" },
  { href: "/haftalik", label: "Hafta",   icon: "☽" },
  { href: "/journal",  label: "Günlük",  icon: "◎" },
  { href: "/profil",   label: "Profil",  icon: "◗" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13, 10, 30, 0.90)",
        borderTop: "1px solid rgba(255, 255, 255, 0.07)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
    >
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-all"
              style={{ color: isActive ? "var(--gold)" : "var(--text-muted)" }}
            >
              <span
                className="text-base transition-all"
                style={{
                  filter: isActive ? "drop-shadow(0 0 8px rgba(212, 175, 95, 0.7))" : "none",
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                }}
              >
                {item.icon}
              </span>
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
