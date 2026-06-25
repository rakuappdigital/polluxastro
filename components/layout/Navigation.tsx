"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/daily",    label: "Günlük",  icon: "/icons/nav-daily.png"   },
  { href: "/okuma",    label: "Okuma",   icon: "/icons/nav-reading.png" },
  { href: "/haftalik", label: "Hafta",   icon: "/icons/nav-weekly.png"  },
  { href: "/journal",  label: "Arşiv",   icon: "/icons/nav-journal.png" },
  { href: "/profil",   label: "Profil",  icon: "/icons/nav-profile.png" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 7, 22, 0.92)",
        borderTop: "1px solid rgba(212, 175, 95, 0.1)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-3.5 gap-1.5 relative transition-all"
            >
              {/* Aktif çizgi - üst kenar */}
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    width: "28px",
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
                  }}
                />
              )}

              {/* İkon */}
              <div
                className="transition-all"
                style={{
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  opacity: isActive ? 1 : 0.45,
                  filter: isActive
                    ? "drop-shadow(0 0 8px rgba(212,175,95,0.5))"
                    : "none",
                }}
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={26}
                  height={26}
                  style={{ objectFit: "contain" }}
                />
              </div>

              {/* Label */}
              <span
                className="text-[9px] uppercase tracking-widest transition-all"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: isActive ? "var(--gold)" : "var(--text-muted)",
                  letterSpacing: "0.12em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Alt güvenli alan (iPhone home indicator) */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </nav>
  );
}
