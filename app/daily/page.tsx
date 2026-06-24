"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDailyCard, getMoonPhase, TarotCard } from "@/lib/tarot-data";
import { getProfile, addJournalEntry, getJournal, generateId, updateStreak, saveProfile } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import TarotCardDisplay from "@/components/cards/TarotCardDisplay";

const MOOD_OPTIONS = [
  { value: 1, label: "Bunaltıcı", emoji: "😔" },
  { value: 2, label: "Gergin", emoji: "😟" },
  { value: 3, label: "Nötr", emoji: "😐" },
  { value: 4, label: "İyi", emoji: "🙂" },
  { value: 5, label: "Harika", emoji: "✨" },
];

type Phase = "morning-ritual" | "reveal" | "reading" | "evening";

export default function DailyPage() {
  const [profile, setProfileState] = useState(getProfile());
  const [card, setCard] = useState<TarotCard | null>(null);
  const [moonPhase, setMoonPhase] = useState(getMoonPhase());
  const [phase, setPhase] = useState<Phase>("morning-ritual");
  const [isRevealed, setIsRevealed] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [eveningNote, setEveningNote] = useState("");
  const [savedEntry, setSavedEntry] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [isEveningTime, setIsEveningTime] = useState(false);
  const [todayEntry, setTodayEntry] = useState<ReturnType<typeof getJournal>[0] | null>(null);

  useEffect(() => {
    const dailyCard = getDailyCard();
    setCard(dailyCard);
    setMoonPhase(getMoonPhase());

    const hour = new Date().getHours();
    setIsEveningTime(hour >= 18);

    // Update streak
    const p = getProfile();
    if (p) {
      const updated = updateStreak(p);
      if (updated.streak !== p.streak || updated.lastCheckIn !== p.lastCheckIn) {
        saveProfile(updated);
        setProfileState(updated);
      }
      setStreak(updated.streak);
    }

    // Check if today's entry exists
    const journal = getJournal();
    const today = new Date().toDateString();
    const existing = journal.find(e =>
      new Date(e.date).toDateString() === today && e.spreadType === "daily"
    );
    if (existing) {
      setTodayEntry(existing);
      setPhase(isEveningTime && !existing.eveningReflection ? "evening" : "reading");
      setIsRevealed(true);
      setSavedEntry(existing.id);
    }
  }, []);

  const handleReveal = () => {
    setIsRevealed(true);
    setTimeout(() => setPhase("reading"), 800);
  };

  const handleSaveReading = () => {
    if (!card || !mood) return;
    const entry = {
      id: generateId(),
      date: new Date().toISOString(),
      spreadType: "daily",
      spreadName: "Günlük Kart",
      cards: [{ card, position: "Günlük Mesaj", isReversed: false }],
      aiReading: card.upright.meaningTR,
      personalNote: note,
      mood: mood as 1 | 2 | 3 | 4 | 5,
      tags: [card.arcana === "major" ? "büyük-arkana" : card.suit || ""],
      eveningReflection: "",
    };
    addJournalEntry(entry);
    setSavedEntry(entry.id);
    setTodayEntry(entry);
  };

  const handleEveningReflection = () => {
    if (!savedEntry || !todayEntry) return;
    const { updateJournalEntry } = require("@/lib/store");
    updateJournalEntry(savedEntry, { eveningReflection: eveningNote });
    setPhase("reading");
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  if (!card) return null;

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <AmbientOrbs />
      <StarField count={40} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {greeting}, {profile?.name || "yolcu"}
            </p>
            <h1 className="font-display text-2xl" style={{ color: "var(--text-primary)" }}>
              Günün Kartı
            </h1>
          </div>

          <div className="text-right">
            <div className="text-2xl mb-0.5">{moonPhase.emoji}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {moonPhase.name}
            </div>
          </div>
        </div>

        {/* Streak */}
        {streak > 1 && (
          <div
            className="glass-gold rounded-2xl px-4 py-3 flex items-center gap-3 mb-6"
          >
            <span className="text-xl">🔥</span>
            <div>
              <div className="font-display-bold text-sm" style={{ color: "var(--gold)" }}>
                {streak} gün üst üste
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Tutarlılığın güçlü bir spiritüel pratik.
              </div>
            </div>
          </div>
        )}

        {/* Moon phase message */}
        <div className="glass rounded-2xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-lg mt-0.5">{moonPhase.emoji}</span>
          <div>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
              {moonPhase.name} Enerjisi
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              {moonPhase.energy}
            </p>
          </div>
        </div>

        {/* MORNING RITUAL */}
        {phase === "morning-ritual" && (
          <div className="text-center animate-fadeInUp">
            <p className="text-base mb-6 leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              Bir nefes al. Bugün için ne hissediyorsun?
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Kartı açmak için hazır olduğunda dokunabilirsin.
              </span>
            </p>

            {/* Card face down */}
            <div className="flex justify-center mb-8">
              <TarotCardDisplay
                size="xl"
                showBack={true}
                onClick={handleReveal}
              />
            </div>

            <button className="btn-primary px-10" onClick={handleReveal}>
              Kartımı Aç ✦
            </button>
          </div>
        )}

        {/* REVEAL */}
        {phase === "reveal" && (
          <div className="text-center animate-fadeInUp">
            <div className="flex justify-center mb-6">
              <TarotCardDisplay
                card={card}
                isRevealed={isRevealed}
                size="xl"
              />
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Bugünün Kartı
              </p>
              <h2 className="font-display text-3xl gradient-gold mb-2">{card.nameTR}</h2>
            </div>
          </div>
        )}

        {/* READING */}
        {phase === "reading" && (
          <div className="animate-fadeInUp">
            {/* Card */}
            <div className="flex justify-center mb-6">
              <TarotCardDisplay
                card={card}
                isRevealed={true}
                size="lg"
              />
            </div>

            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Günün Kartı
              </p>
              <h2 className="font-display text-3xl gradient-gold mb-1">{card.nameTR}</h2>

              {/* Element/Planet */}
              {(card.element || card.planet || card.zodiac) && (
                <div className="flex items-center justify-center gap-3 mb-2">
                  {card.element && (
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      ◆ {card.element}
                    </span>
                  )}
                  {card.planet && (
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      ◆ {card.planet}
                    </span>
                  )}
                  {card.zodiac && (
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      ◆ {card.zodiac}
                    </span>
                  )}
                </div>
              )}

              {/* Keywords */}
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {card.keywordsTR.map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-0.5 rounded-full text-xs"
                    style={{
                      background: `${card.color}15`,
                      border: `1px solid ${card.color}35`,
                      color: card.color,
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Main message */}
            <div className="glass-gold rounded-2xl p-5 mb-4">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ✦ Günün Mesajı
              </div>
              <p className="leading-relaxed font-display text-lg" style={{ color: "var(--text-primary)" }}>
                {card.upright.meaningTR}
              </p>
            </div>

            {/* Focus-specific messages */}
            {profile?.focus?.includes("love") && (
              <div className="glass rounded-2xl p-4 mb-3">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--rose)", fontFamily: "var(--font-inter)" }}>
                  ♡ Aşk & İlişkiler
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {card.upright.love}
                </p>
              </div>
            )}
            {profile?.focus?.includes("career") && (
              <div className="glass rounded-2xl p-4 mb-3">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                  ◎ Kariyer & Para
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {card.upright.career}
                </p>
              </div>
            )}
            {profile?.focus?.includes("spiritual") && (
              <div className="glass rounded-2xl p-4 mb-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>
                  ✦ Ruhsal Rehberlik
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {card.upright.spiritual}
                </p>
              </div>
            )}

            {/* Symbolism */}
            <div className="glass rounded-2xl p-4 mb-6">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                ◗ Sembolizm
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                {card.symbolism}
              </p>
            </div>

            {/* Reflection question */}
            <div
              className="rounded-2xl p-4 mb-6"
              style={{
                background: `linear-gradient(135deg, ${card.color}10, rgba(107,91,166,0.08))`,
                border: `1px solid ${card.color}25`,
              }}
            >
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: card.color, fontFamily: "var(--font-inter)" }}>
                ◎ Günün Sorusu
              </div>
              <p className="font-display text-lg leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {card.arcana === "major"
                  ? `Bu kart sana bugün ne söylüyor? ${card.nameTR} enerjisi hayatının hangi alanında beliriyor?`
                  : `${card.keywordsTR[0]} kavramını bugün nasıl deneyimleyeceksin?`
                }
              </p>
            </div>

            {/* Save section - only if not saved */}
            {!savedEntry ? (
              <div className="mb-6">
                <div className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  Şu anki ruh halini işaretle:
                </div>
                <div className="flex gap-2 mb-4">
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                      style={{
                        background: mood === m.value ? "rgba(212,175,95,0.15)" : "var(--bg-glass)",
                        border: `1px solid ${mood === m.value ? "rgba(212,175,95,0.4)" : "var(--border-glass)"}`,
                      }}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <span className="text-[9px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>

                <textarea
                  className="input-mystic w-full mb-4 text-sm resize-none"
                  placeholder="Bu kart sana ne hissettirdi? Kişisel notun... (isteğe bağlı)"
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />

                <button
                  className="btn-primary w-full"
                  onClick={handleSaveReading}
                  disabled={!mood}
                  style={{ opacity: mood ? 1 : 0.4 }}
                >
                  Günlüğe Kaydet ◎
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <div
                  className="glass rounded-2xl p-4 flex items-center gap-3"
                >
                  <span className="text-xl">✓</span>
                  <div>
                    <div className="text-sm font-display-bold" style={{ color: "var(--gold)" }}>
                      Günlüğe kaydedildi
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      Akşam yansıması için tekrar uğra.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deep reading CTA */}
            <div
              className="rounded-2xl p-5 mb-4 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(107,91,166,0.15), rgba(45,27,94,0.2))",
                border: "1px solid rgba(107,91,166,0.3)",
              }}
            >
              <div className="text-2xl mb-2">⊹</div>
              <div className="font-display text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                Daha derin gitmek ister misin?
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Konu odaklı AI destekli okuma yap
              </p>
              <Link href="/okuma" className="btn-ghost inline-block px-6 py-2.5 text-sm">
                Okumaya Geç →
              </Link>
            </div>
          </div>
        )}

        {/* EVENING REFLECTION */}
        {phase === "evening" && isEveningTime && (
          <div className="animate-fadeInUp">
            <div className="glass-gold rounded-2xl p-5 mb-6">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ☽ Akşam Yansıması
              </div>
              <p className="font-display text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                Bu kart bugün sende nasıl belirdi?
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                {card.nameTR} — {card.keywordsTR.join(", ")}
              </p>
            </div>

            <textarea
              className="input-mystic w-full mb-4 text-sm resize-none"
              placeholder="Bugün bu enerjiyi nerede hissettin? Kartla bağlantı kurabildin mi?"
              rows={5}
              value={eveningNote}
              onChange={e => setEveningNote(e.target.value)}
            />

            <button
              className="btn-gold w-full"
              onClick={handleEveningReflection}
            >
              Kapanış Ritüelini Tamamla ☽
            </button>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
