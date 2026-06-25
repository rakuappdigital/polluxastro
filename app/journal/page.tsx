"use client";

import { useState, useEffect, useMemo } from "react";
import { getJournal, JournalEntry } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { TAROT_CARDS } from "@/lib/tarot-data";
import Image from "next/image";

const MOOD_EMOJIS = ["", "😔", "😟", "😐", "🙂", "✨"];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "daily" | "readings">("all");

  useEffect(() => {
    setEntries(getJournal());
  }, []);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filter === "daily") return e.spreadType === "daily";
      if (filter === "readings") return e.spreadType !== "daily";
      return true;
    });
  }, [entries, filter]);

  // Card frequency analysis
  const cardFrequency = useMemo(() => {
    const freq: Record<string, { count: number; card: typeof TAROT_CARDS[0] }> = {};
    entries.forEach(e => {
      e.cards?.forEach(c => {
        const id = c.card.id;
        if (!freq[id]) freq[id] = { count: 0, card: TAROT_CARDS.find(t => t.id === id) || c.card };
        freq[id].count++;
      });
    });
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [entries]);

  // Mood average
  const avgMood = useMemo(() => {
    const moods = entries.filter(e => e.mood).map(e => e.mood);
    if (!moods.length) return 0;
    return moods.reduce((a, b) => a + b, 0) / moods.length;
  }, [entries]);

  // Most common suit
  const suitFrequency = useMemo(() => {
    const suits: Record<string, number> = {};
    entries.forEach(e => {
      e.cards?.forEach(c => {
        if (c.card.suit) {
          suits[c.card.suit] = (suits[c.card.suit] || 0) + 1;
        } else {
          suits["major"] = (suits["major"] || 0) + 1;
        }
      });
    });
    return Object.entries(suits).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [entries]);

  const SUIT_NAMES: Record<string, string> = {
    wands: "Değnekler", cups: "Kupalar", swords: "Kılıçlar", pentacles: "Pentakıllar", major: "Büyük Arkana"
  };
  const SUIT_ICONS: Record<string, string> = {
    wands: "/icons/element-fire.png",
    cups: "/icons/element-water.png",
    swords: "/icons/element-air.png",
    pentacles: "/icons/element-earth.png",
    major: "",
  };

  if (selected) {
    return (
      <main className="relative min-h-screen overflow-hidden pb-24">
        <AmbientOrbs />
        <StarField count={20} />
        <div className="relative z-10 max-w-md mx-auto px-5 pt-12">
          <button
            onClick={() => setSelected(null)}
            className="text-sm mb-4 flex items-center gap-2"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
          >
            ← Günlüğe dön
          </button>

          <div className="mb-6">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {format(new Date(selected.date), "d MMMM yyyy, EEEE", { locale: tr })}
            </p>
            <h2 className="font-display text-2xl gradient-gold">{selected.spreadName}</h2>
            {selected.question && (
              <p className="text-sm mt-1 italic" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                "{selected.question}"
              </p>
            )}
          </div>

          {/* Cards */}
          <div className="glass rounded-2xl p-4 mb-4">
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Çekilen Kartlar
            </div>
            <div className="space-y-2">
              {selected.cards?.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: c.card.color || "var(--gold)" }}
                  />
                  <div>
                    <span className="font-display-bold text-sm" style={{ color: c.card.color || "var(--gold)" }}>
                      {c.card.nameTR}
                    </span>
                    {c.isReversed && (
                      <span className="text-xs ml-1" style={{ color: "var(--rose)", fontFamily: "var(--font-inter)" }}>
                        (Ters)
                      </span>
                    )}
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      — {c.position}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Reading */}
          {selected.aiReading && (
            <div className="glass-gold rounded-2xl p-4 mb-4">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ✦ Yorum
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}
                dangerouslySetInnerHTML={{
                  __html: selected.aiReading.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--gold)">$1</strong>')
                }}
              />
            </div>
          )}

          {/* Personal Note */}
          {selected.personalNote && (
            <div className="glass rounded-2xl p-4 mb-4">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                ◗ Kişisel Notum
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                {selected.personalNote}
              </p>
            </div>
          )}

          {/* Evening Reflection */}
          {selected.eveningReflection && (
            <div className="glass rounded-2xl p-4 mb-4">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>
                ☽ Akşam Yansıması
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                {selected.eveningReflection}
              </p>
            </div>
          )}

          {selected.mood && (
            <div className="text-center py-4">
              <span className="text-2xl">{MOOD_EMOJIS[selected.mood]}</span>
            </div>
          )}
        </div>
        <Navigation />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <AmbientOrbs />
      <StarField count={25} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl gradient-gold mb-1">Günlük</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
            {entries.length} okuma · Spiritüel yolculuğun
          </p>
        </div>

        {/* Analytics */}
        {entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass rounded-2xl p-3 text-center">
              <div className="font-display text-2xl gradient-gold">{entries.length}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Okuma</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl">{avgMood > 0 ? MOOD_EMOJIS[Math.round(avgMood)] : "–"}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Ortalama Mod</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="flex justify-center">
              {suitFrequency && SUIT_ICONS[suitFrequency] ? (
                <Image src={SUIT_ICONS[suitFrequency]} alt={SUIT_NAMES[suitFrequency] || ""} width={26} height={26} style={{ objectFit: "contain" }} />
              ) : (
                <span className="text-xl" style={{ color: "var(--gold)" }}>✦</span>
              )}
            </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                {suitFrequency ? SUIT_NAMES[suitFrequency] : "Veri yok"}
              </div>
            </div>
          </div>
        )}

        {/* Top cards */}
        {cardFrequency.length > 0 && (
          <div className="glass-gold rounded-2xl p-4 mb-6">
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
              ✦ En Çok Çektiğin Kartlar
            </div>
            <div className="flex flex-wrap gap-2">
              {cardFrequency.map(({ card, count }) => (
                <div
                  key={card.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: `${card.color}15`,
                    border: `1px solid ${card.color}35`,
                  }}
                >
                  <span className="text-xs font-display-bold" style={{ color: card.color }}>
                    {card.nameTR}
                  </span>
                  <span
                    className="text-xs w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: card.color, color: "#1A0A2E", fontSize: "9px", fontFamily: "var(--font-inter)" }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "daily", "readings"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm transition-all"
              style={{
                background: filter === f ? "rgba(212,175,95,0.15)" : "var(--bg-glass)",
                border: `1px solid ${filter === f ? "rgba(212,175,95,0.4)" : "var(--border-glass)"}`,
                color: filter === f ? "var(--gold)" : "var(--text-muted)",
                fontFamily: "var(--font-inter)",
              }}
            >
              {f === "all" ? "Tümü" : f === "daily" ? "Günlük" : "Okumalar"}
            </button>
          ))}
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4 opacity-40">◎</div>
            <p className="font-display text-xl mb-2" style={{ color: "var(--text-muted)" }}>
              Henüz kayıt yok
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              İlk okumana başla ve spiritüel yolculuğunu izle.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full glass rounded-2xl p-4 text-left transition-all"
                style={{ display: "block" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,95,0.25)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        {format(new Date(entry.date), "d MMM", { locale: tr })}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,95,0.1)", color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                        {entry.spreadName}
                      </span>
                    </div>

                    {entry.question && (
                      <p className="text-xs mb-1 italic truncate" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                        "{entry.question}"
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.cards?.slice(0, 3).map((c, i) => (
                        <span
                          key={i}
                          className="text-xs"
                          style={{ color: c.card.color || "var(--gold)", fontFamily: "var(--font-inter)" }}
                        >
                          {c.card.nameTR}{i < Math.min(2, (entry.cards?.length || 1) - 1) ? " · " : ""}
                        </span>
                      ))}
                      {(entry.cards?.length || 0) > 3 && (
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                          +{(entry.cards?.length || 0) - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {entry.mood && <span className="text-lg">{MOOD_EMOJIS[entry.mood]}</span>}
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
