"use client";

import { useState, useEffect, useMemo } from "react";
import { getJournal, getProfile, buildUserContext, saveWeeklySummary, getWeeklySummary } from "@/lib/store";
import { TAROT_CARDS } from "@/lib/tarot-data";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";

const SUIT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  wands: { label: "Değnekler", emoji: "🔥", color: "#E8CC7A" },
  cups: { label: "Kupalar", emoji: "💧", color: "#8B75C6" },
  swords: { label: "Kılıçlar", emoji: "⚡", color: "#C9818A" },
  pentacles: { label: "Pentakıllar", emoji: "⭐", color: "#7A9E8A" },
  major: { label: "Büyük Arkana", emoji: "✦", color: "#D4AF5F" },
};

const MOOD_EMOJIS = ["", "😔", "😟", "😐", "🙂", "✨"];

export default function HafalikPage() {
  const [aiSummary, setAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cached, setCached] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const journal = getJournal();
  const profile = getProfile();

  const weekEntries = useMemo(() =>
    journal.filter(e =>
      isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
    ), [journal]);

  const cardFreq = useMemo(() => {
    const freq: Record<number, { card: typeof TAROT_CARDS[0]; count: number }> = {};
    weekEntries.forEach(e => {
      e.cards?.forEach(c => {
        if (!freq[c.card.id]) freq[c.card.id] = { card: TAROT_CARDS.find(t => t.id === c.card.id) || c.card, count: 0 };
        freq[c.card.id].count++;
      });
    });
    return Object.values(freq).sort((a, b) => b.count - a.count);
  }, [weekEntries]);

  const dominantSuit = useMemo(() => {
    const suits: Record<string, number> = {};
    weekEntries.forEach(e => {
      e.cards?.forEach(c => {
        const key = c.card.suit || "major";
        suits[key] = (suits[key] || 0) + 1;
      });
    });
    return Object.entries(suits).sort((a, b) => b[1] - a[1])[0]?.[0] || "major";
  }, [weekEntries]);

  const avgMood = useMemo(() => {
    const moods = weekEntries.filter(e => e.mood).map(e => e.mood);
    if (!moods.length) return 0;
    return moods.reduce((a, b) => a + b, 0) / moods.length;
  }, [weekEntries]);

  useEffect(() => {
    const cached = getWeeklySummary();
    if (cached && new Date(cached.weekStart).toDateString() === weekStart.toDateString()) {
      setAiSummary(cached.aiSummary);
      setCached(true);
    }
  }, []);

  const fetchSummary = async () => {
    if (!weekEntries.length) return;
    setIsLoading(true);

    const cardsSummary = cardFreq.slice(0, 6).map(({ card, count }) =>
      `${card.nameTR}${count > 1 ? ` (${count}x)` : ""}`
    ).join(", ");

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "weekly",
          cardsSummary,
          avgMood: avgMood.toFixed(1),
          dominantSuit: SUIT_LABELS[dominantSuit]?.label || dominantSuit,
          userContext: profile ? buildUserContext(profile) : "",
        }),
      });
      const data = await res.json();
      const summary = data.reading || "";
      setAiSummary(summary);

      saveWeeklySummary({
        weekStart: weekStart.toISOString(),
        cards: cardFreq,
        dominantSuit,
        avgMood,
        aiSummary: summary,
        generatedAt: new Date().toISOString(),
      });
      setCached(false);
    } catch {
      setAiSummary("Özet alınamadı. Bağlantını kontrol et.");
    }
    setIsLoading(false);
  };

  const suit = SUIT_LABELS[dominantSuit];

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <StarField count={20} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-10">
        <div className="mb-7">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
            {format(weekStart, "d MMM", { locale: tr })} — {format(weekEnd, "d MMM yyyy", { locale: tr })}
          </p>
          <h1 className="font-display text-3xl gradient-gold">Haftalık Özet</h1>
        </div>

        {weekEntries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4 opacity-40">◎</div>
            <p className="font-display text-xl mb-2" style={{ color: "var(--text-muted)" }}>Bu hafta henüz okuma yok</p>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              İlk okumanı yap, haftalık özet burada görünür.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass rounded-2xl p-3 text-center">
                <div className="font-display text-2xl gradient-gold">{weekEntries.length}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Okuma</div>
              </div>
              <div className="glass rounded-2xl p-3 text-center">
                <div className="text-2xl">{avgMood > 0 ? MOOD_EMOJIS[Math.round(avgMood)] : "–"}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Ort. Mod</div>
              </div>
              <div className="glass rounded-2xl p-3 text-center">
                <div className="text-xl">{suit?.emoji || "✦"}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                  {suit?.label || "–"}
                </div>
              </div>
            </div>

            {/* Dominant element message */}
            {suit && (
              <div className="glass rounded-2xl p-4 mb-5"
                style={{ borderColor: `${suit.color}30` }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{suit.emoji}</span>
                  <div>
                    <div className="font-display-bold text-sm" style={{ color: suit.color }}>
                      {suit.label} haftasıydı
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      {{
                        wands: "Ateş enerjisi ön plandaydı — tutku, hareket, yaratıcılık.",
                        cups: "Su enerjisi dominanttı — duygular, ilişkiler, sezgi.",
                        swords: "Hava enerjisi güçlüydü — zihin, karar, netlik.",
                        pentacles: "Toprak enerjisiyle geçti — pratik, madde, inşa.",
                        major: "Büyük Arkana belirleyiciydi — dönüşüm ve büyük temalar.",
                      }[dominantSuit] || ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top kartlar */}
            <div className="glass-gold rounded-2xl p-4 mb-5">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ✦ Bu Haftanın Kartları
              </div>
              <div className="space-y-2">
                {cardFreq.slice(0, 5).map(({ card, count }) => (
                  <div key={card.id} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: card.color }} />
                    <span className="font-display-bold text-sm flex-1" style={{ color: card.color }}>
                      {card.nameTR}
                    </span>
                    {count > 1 && (
                      <span className="text-xs w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: `${card.color}25`, color: card.color, fontFamily: "var(--font-inter)" }}>
                        {count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Özet */}
            <div className="glass-gold rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(212,175,95,0.2)", fontSize: "9px", color: "var(--gold)" }}>✦</div>
                  <span className="text-xs uppercase tracking-widest" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                    Lyra — Haftalık Yorum
                  </span>
                </div>
                {cached && (
                  <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    Önbellekten
                  </span>
                )}
              </div>

              {aiSummary ? (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {aiSummary}
                </p>
              ) : (
                <div>
                  <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    Bu haftanın spiritüel temasını Lyra&apos;dan al.
                  </p>
                  <button className="btn-primary w-full" onClick={fetchSummary} disabled={isLoading}>
                    {isLoading ? "Hazırlanıyor..." : "Haftalık Yorumu Al ✦"}
                  </button>
                </div>
              )}

              {aiSummary && (
                <button className="text-xs mt-3 w-full text-center"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
                  onClick={fetchSummary} disabled={isLoading}>
                  {isLoading ? "Yenileniyor..." : "Yenile"}
                </button>
              )}
            </div>

            {/* Günler */}
            <div className="glass rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Haftalık Aktivite
              </div>
              <div className="space-y-2">
                {weekEntries.slice(0, 7).map(entry => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <span className="text-xs w-12 flex-shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      {format(new Date(entry.date), "EEE", { locale: tr })}
                    </span>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {entry.cards?.slice(0, 3).map((c, i) => (
                        <span key={i} className="text-xs" style={{ color: c.card.color, fontFamily: "var(--font-inter)" }}>
                          {c.card.nameTR}
                        </span>
                      ))}
                    </div>
                    {entry.mood && <span className="text-sm">{MOOD_EMOJIS[entry.mood]}</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Navigation />
    </main>
  );
}
