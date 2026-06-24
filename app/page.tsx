"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isOnboarded } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOnboarded()) {
        router.push("/daily");
      } else {
        router.push("/onboarding");
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AmbientOrbs />
      <StarField count={60} />
      <div className="relative z-10 text-center animate-fadeInUp">
        <div
          className="text-8xl mb-6 animate-float"
          style={{ filter: "drop-shadow(0 0 30px rgba(212,175,95,0.7))" }}
        >
          ✦
        </div>
        <h1
          className="font-display text-5xl mb-2 gradient-gold"
          style={{ letterSpacing: "0.12em" }}
        >
          POLLUX
        </h1>
        <p
          className="tracking-widest uppercase mt-2"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-inter)",
            fontSize: "11px",
            letterSpacing: "0.3em",
          }}
        >
          Astro · Tarot · Kehanet
        </p>
      </div>
    </main>
  );
}
