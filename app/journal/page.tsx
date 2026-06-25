"use client";

import { useState, useEffect, useMemo } from "react";
import { getJournal, JournalEntry } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Navigation from "@/components/layout/Navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { TAROT_CARDS } from "@/lib/tarot-data";
import Image from "next/image";

const MOOD_ICONS = ["", "/icons/mod1.png", "/icons/mod2.png", "/icons/mod3.png", "/icons/mod4.png", "/icons/mod5.png"];
const SUIT_ICONS: Record<string, string> = {
  wands: "/icons/suit-wands.png", cups: "/icons/suit-cups.png",
  swords: "/icons/suit-swords.png", pentacles: "/icons/suit-pentacles.png", major: "",
};
const SUIT_NAMES: Record<string, string> = {
  wands: "Değnekler", cups: "Kupalar", swords: "Kılıçlar", pentacles: "Pentakıllar", major: "Büyük Arkana"
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "daily" | "readings">("all");

  useEffect(() => { setEntries(getJournal()); }, []);

  const filtered = useMemo(() => entries.filter(e => filter === "daily" ? e.spreadType === "daily" : filter === "readings" ? e.spreadType !== "daily" : true), [entries, filter]);

  const cardFrequency = useMemo(() => {
    const freq: Record<string, { count: number; card: typeof TAROT_CARDS[0] }> = {};
    entries.forEach(e => e.cards?.forEach(c => {
      const id = c.card.id;
      if (!freq[id]) freq[id] = { count: 0, card: TAROT_CARDS.find(t => t.id === id) || c.card };
      freq[id].count++;
    }));
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [entries]);

  const avgMood = useMemo(() => { const m = entries.filter(e => e.mood).map(e => e.mood); return m.length ? m.reduce((a, b) => a + b, 0) / m.length : 0; }, [entries]);

  const suitFrequency = useMemo(() => {
    const s: Record<string, number> = {};
    entries.forEach(e => e.cards?.forEach(c => { const k = c.card.suit || "major"; s[k] = (s[k] || 0) + 1; }));
    return Object.entries(s).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [entries]);

  if (selected) {
    return (
      <main className="relative min-h-screen overflow-hidden pb-28">
        <AmbientOrbs />
        <div className="relative z-10 max-w-md mx-auto px-6 pt-12">
          <button onClick={() => setSelected(null)} className="text-xs uppercase tracking-widest mb-6 block"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)", background: "none", border: "none", cursor: "pointer" }}>
            ← Arşiv
          </button>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
            {format(new Date(selected.date), "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
          <h2 className="font-display text-3xl gradient-gold mb-1">{selected.spreadName}</h2>
          {selected.question && <p className="text-sm italic mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>"{selected.question}"</p>}

          <div className="aether-line" />
          <div className="aether-label">Kartlar</div>
          {selected.cards?.map((c, i) => (
            <div key={i} className="aether-row">
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: c.card.color || "var(--gold)" }} />
              <div>
                <span className="font-display-bold text-sm" style={{ color: c.card.color || "var(--gold)" }}>{c.card.nameTR}</span>
                {c.isReversed && <span className="text-xs ml-2" style={{ color: "var(--rose)", fontFamily: "var(--font-inter)" }}>ters</span>}
                <span className="text-xs ml-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>— {c.position}</span>
              </div>
            </div>
          ))}

          {selected.aiReading && (
            <>
              <div className="aether-line" />
              <div className="aether-label">
                <Image src="/icons/icon-lyra.png" alt="Lyra" width={12} height={12} style={{ objectFit: "contain" }} />
                Lyra
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}
                dangerouslySetInnerHTML={{ __html: selected.aiReading.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--gold)">$1</strong>') }} />
            </>
          )}

          {selected.personalNote && (
            <>
              <div className="aether-line" />
              <div className="aether-label">Notum</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{selected.personalNote}</p>
            </>
          )}

          {selected.eveningReflection && (
            <>
              <div className="aether-line" />
              <div className="aether-label">Akşam Yansıması</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{selected.eveningReflection}</p>
            </>
          )}

          {selected.mood && (
            <div className="flex items-center gap-3 mt-6">
              <Image src={MOOD_ICONS[selected.mood]} alt="mood" width={28} height={28} style={{ objectFit: "contain" }} />
            </div>
          )}
        </div>
        <Navigation />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <div className="relative z-10 max-w-md mx-auto px-6 pt-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl" style={{ color: "var(--text-primary)" }}>Arşiv</h1>
            <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{entries.length} okuma</p>
          </div>
          {avgMood > 0 && <Image src={MOOD_ICONS[Math.round(avgMood)]} alt="avg mood" width={28} height={28} style={{ objectFit: "contain" }} />}
        </div>

        {entries.length >= 3 && (
          <>
            <div className="aether-line" />
            <div className="flex gap-6 pb-2">
              <div>
                <p className="font-display text-2xl gradient-gold">{entries.length}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Okuma</p>
              </div>
              {suitFrequency && SUIT_ICONS[suitFrequency] && (
                <div className="flex items-center gap-2">
                  <Image src={SUIT_ICONS[suitFrequency]} alt={SUIT_NAMES[suitFrequency]} width={24} height={24} style={{ objectFit: "contain" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{SUIT_NAMES[suitFrequency]}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>dominant element</p>
                  </div>
                </div>
              )}
            </div>
            {cardFrequency.length > 0 && (
              <>
                <div className="aether-line" />
                <div className="aether-label">En Çok Çekilen</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                  {cardFrequency.map(({ card, count }) => (
                    <span key={card.id} className="text-sm font-display-bold" style={{ color: card.color }}>
                      {card.nameTR}{count > 1 && <sup className="text-xs ml-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{count}</sup>}
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="aether-line" />
        <div className="aether-options mb-6">
          {(["all", "daily", "readings"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`aether-option ${filter === f ? "active" : ""}`}>
              <span className="aether-option-label">{f === "all" ? "Tümü" : f === "daily" ? "Günlük" : "Okumalar"}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-xl" style={{ color: "var(--text-muted)" }}>Henüz kayıt yok</p>
          </div>
        ) : (
          filtered.map(entry => (
            <button key={entry.id} onClick={() => setSelected(entry)} className="aether-spread-row w-full text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    {format(new Date(entry.date), "d MMM", { locale: tr })}
                  </span>
                  <span className="text-xs" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>{entry.spreadName}</span>
                </div>
                {entry.question && <p className="text-xs italic truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>"{entry.question}"</p>}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {entry.cards?.slice(0, 3).map((c, i) => (
                    <span key={i} className="text-xs font-display-bold" style={{ color: c.card.color }}>{c.card.nameTR}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {entry.mood && <Image src={MOOD_ICONS[entry.mood]} alt="mood" width={18} height={18} style={{ objectFit: "contain" }} />}
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>→</span>
              </div>
            </button>
          ))
        )}
      </div>
      <Navigation />
    </main>
  );
}
