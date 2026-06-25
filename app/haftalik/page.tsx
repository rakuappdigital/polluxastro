"use client";

import { useState, useEffect, useMemo } from "react";
import { getJournal, getProfile, buildUserContext, saveWeeklySummary, getWeeklySummary } from "@/lib/store";
import { TAROT_CARDS } from "@/lib/tarot-data";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Navigation from "@/components/layout/Navigation";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";

const MOOD_ICONS = ["", "/icons/mod1.png", "/icons/mod2.png", "/icons/mod3.png", "/icons/mod4.png", "/icons/mod5.png"];
const SUIT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  wands:    { label: "Değnekler",    icon: "/icons/suit-wands.png",     color: "#E8CC7A" },
  cups:     { label: "Kupalar",      icon: "/icons/suit-cups.png",      color: "#8B75C6" },
  swords:   { label: "Kılıçlar",    icon: "/icons/suit-swords.png",    color: "#C9818A" },
  pentacles:{ label: "Pentakıllar", icon: "/icons/suit-pentacles.png", color: "#7A9E8A" },
  major:    { label: "Büyük Arkana", icon: "",                           color: "#D4AF5F" },
};

export default function HaftalikPage() {
  const [aiSummary, setAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const journal = getJournal();
  const profile = getProfile();

  const weekEntries = useMemo(() =>
    journal.filter(e => isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })),
  [journal]);

  const cardFreq = useMemo(() => {
    const freq: Record<number, { card: typeof TAROT_CARDS[0]; count: number }> = {};
    weekEntries.forEach(e => e.cards?.forEach(c => {
      if (!freq[c.card.id]) freq[c.card.id] = { card: TAROT_CARDS.find(t => t.id === c.card.id) || c.card, count: 0 };
      freq[c.card.id].count++;
    }));
    return Object.values(freq).sort((a, b) => b.count - a.count);
  }, [weekEntries]);

  const dominantSuit = useMemo(() => {
    const suits: Record<string, number> = {};
    weekEntries.forEach(e => e.cards?.forEach(c => { const k = c.card.suit || "major"; suits[k] = (suits[k] || 0) + 1; }));
    return Object.entries(suits).sort((a, b) => b[1] - a[1])[0]?.[0] || "major";
  }, [weekEntries]);

  const avgMood = useMemo(() => {
    const moods = weekEntries.filter(e => e.mood).map(e => e.mood);
    return moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
  }, [weekEntries]);

  useEffect(() => {
    const cached = getWeeklySummary();
    if (cached && new Date(cached.weekStart).toDateString() === weekStart.toDateString()) {
      setAiSummary(cached.aiSummary);
    }
  }, []);

  const fetchSummary = async () => {
    if (!weekEntries.length) return;
    setIsLoading(true);
    const cardsSummary = cardFreq.slice(0, 6).map(({ card, count }) => `${card.nameTR}${count > 1 ? ` (${count}x)` : ""}`).join(", ");
    const suit = SUIT_LABELS[dominantSuit];
    try {
      const res = await fetch("/api/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "weekly", cardsSummary, avgMood: avgMood.toFixed(1), dominantSuit: suit?.label || dominantSuit, userContext: profile ? buildUserContext(profile) : "" }),
      });
      const data = await res.json();
      setAiSummary(data.reading || "");
      saveWeeklySummary({ weekStart: weekStart.toISOString(), cards: cardFreq, dominantSuit, avgMood, aiSummary: data.reading || "", generatedAt: new Date().toISOString() });
    } catch { setAiSummary("Özet alınamadı."); }
    setIsLoading(false);
  };

  const suit = SUIT_LABELS[dominantSuit];

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <div className="relative z-10 max-w-md mx-auto px-6 pt-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
            {format(weekStart, "d MMM", { locale: tr })} — {format(weekEnd, "d MMM yyyy", { locale: tr })}
          </p>
          <h1 className="font-display text-3xl gradient-gold">Haftalık Özet</h1>
        </div>

        {weekEntries.length === 0 ? (
          <>
            <div className="aether-line" />
            <p className="font-display text-xl py-8" style={{ color: "var(--text-muted)" }}>Bu hafta henüz okuma yok</p>
          </>
        ) : (
          <>
            <div className="aether-line" />
            <div className="flex gap-8 pb-2">
              <div>
                <p className="font-display text-2xl gradient-gold">{weekEntries.length}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Okuma</p>
              </div>
              {avgMood > 0 && (
                <div className="flex items-center gap-2">
                  <Image src={MOOD_ICONS[Math.round(avgMood)]} alt="avg mood" width={24} height={24} style={{ objectFit: "contain" }} />
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Ort. Mod</p>
                </div>
              )}
              {suit && (
                <div className="flex items-center gap-2">
                  {suit.icon ? <Image src={suit.icon} alt={suit.label} width={22} height={22} style={{ objectFit: "contain" }} /> : <span style={{ color: suit.color }}>✦</span>}
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{suit.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>dominant</p>
                  </div>
                </div>
              )}
            </div>

            <div className="aether-line" />
            <div className="aether-label">Bu Haftanın Kartları</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              {cardFreq.slice(0, 6).map(({ card, count }) => (
                <span key={card.id} className="text-sm font-display-bold" style={{ color: card.color }}>
                  {card.nameTR}{count > 1 && <sup className="text-xs ml-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{count}</sup>}
                </span>
              ))}
            </div>

            <div className="aether-line" />
            <div className="aether-label">
              <Image src="/icons/icon-lyra.png" alt="Lyra" width={12} height={12} style={{ objectFit: "contain" }} />
              Lyra — Haftalık Yorum
            </div>

            {aiSummary ? (
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{aiSummary}</p>
            ) : (
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Bu haftanın spiritüel temasını Lyra&apos;dan al.</p>
            )}
            <button className="btn-aether mb-6" onClick={fetchSummary} disabled={isLoading}>
              {isLoading ? "Hazırlanıyor..." : aiSummary ? "Yenile" : "Haftalık Yorumu Al"}
            </button>

            <div className="aether-line" />
            <div className="aether-label">Haftalık Aktivite</div>
            {weekEntries.slice(0, 7).map(entry => (
              <div key={entry.id} className="aether-row">
                <span className="text-xs w-10 flex-shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                  {format(new Date(entry.date), "EEE", { locale: tr })}
                </span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {entry.cards?.slice(0, 3).map((c, i) => (
                    <span key={i} className="text-xs font-display-bold" style={{ color: c.card.color }}>{c.card.nameTR}</span>
                  ))}
                </div>
                {entry.mood && <Image src={MOOD_ICONS[entry.mood]} alt="mood" width={18} height={18} style={{ objectFit: "contain" }} />}
              </div>
            ))}
          </>
        )}
      </div>
      <Navigation />
    </main>
  );
}
