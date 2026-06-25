"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isOnboarded } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Logo from "@/components/ui/Logo";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(isOnboarded() ? "/daily" : "/onboarding");
    }, 2200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AmbientOrbs />
      <div className="relative z-10 text-center animate-fadeInUp">
        <Logo size={80} showWordmark className="mb-2" />
        <p
          className="tracking-[0.4em] uppercase mt-4"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-inter)",
            fontSize: "10px",
          }}
        >
          Tarot · Spiritüel Rehberlik
        </p>
      </div>
    </main>
  );
}
