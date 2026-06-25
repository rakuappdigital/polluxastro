"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, saveProfile, getJournal, UserProfile } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getMoonPhase } from "@/lib/tarot-data";

const DECK_OPTIONS = [
  { id: "classic", label: "Klasik", desc: "Rider-Waite-Smith geleneği", icon: "✦" },
  { id: "minimal", label: "Minimal", desc: "Modern çizgi sanatı", icon: "◎" },
  { id: "gothic", label: "Gotik", desc: "Koyu mistik estetik", icon: "◗" },
] as const;

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [journalCount, setJournalCount] = useState(0);
  const [moonPhase] = useState(getMoonPhase());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setJournalCount(getJournal().length);
  }, []);

  const handleDeckChange = (deck: UserProfile["deckPreference"]) => {
    if (!profile) return;
    const updated = { ...profile, deckPreference: deck };
    saveProfile(updated);
    setProfile(updated);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      router.push("/onboarding");
    }
  };

  if (!profile) return null;

  const joinDate = new Date(profile.createdAt);
  const daysSince = Math.floor((Date.now() - joinDate.getTime()) / 86400000);

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <AmbientOrbs />
      <StarField count={20} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-12">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{
              background: "linear-gradient(135deg, #4A2D8A, #2D1B5E)",
              border: "2px solid rgba(212,175,95,0.4)",
              boxShadow: "0 0 30px rgba(107,91,166,0.4)",
            }}
          >
            ✦
          </div>

          <h1 className="font-display text-3xl gradient-gold mb-1">{profile.name}</h1>

          {profile.primaryBirthCard && (
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {profile.primaryBirthCard.nameTR} doğum kartlı
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-2xl p-3 text-center">
            <div className="font-display text-2xl gradient-gold">{profile.streak || 0}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Seri 🔥</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="font-display text-2xl gradient-gold">{journalCount}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Okuma</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="font-display text-2xl gradient-gold">{daysSince}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Gün</div>
          </div>
        </div>

        {/* Birth Card */}
        {profile.primaryBirthCard && (
          <div className="glass-gold rounded-2xl p-5 mb-6">
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
              ✦ Doğum Kartın
            </div>
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: `linear-gradient(165deg, ${profile.primaryBirthCard.color}22, #1A0A2E)`,
                  border: `1px solid ${profile.primaryBirthCard.color}44`,
                }}
              >
                ✦
              </div>
              <div>
                <div className="font-display text-xl mb-1" style={{ color: profile.primaryBirthCard.color }}>
                  {profile.primaryBirthCard.nameTR}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {profile.primaryBirthCard.upright.meaningTR.split(".")[0]}.
                </p>
                {profile.secondaryBirthCard && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    İkincil: <span style={{ color: "var(--gold)" }}>{profile.secondaryBirthCard.nameTR}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Moon Phase */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{moonPhase.emoji}</span>
            <div>
              <div className="font-display-bold text-sm" style={{ color: "var(--text-primary)" }}>
                {moonPhase.name}
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                {moonPhase.energy}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                Önerilen: {moonPhase.spreadSuggestion}
              </p>
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        {profile.focus?.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Odak Alanların
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.focus.map(f => {
                const labels: Record<string, { label: string; icon: string }> = {
                  love: { label: "Aşk", icon: "♡" },
                  career: { label: "Kariyer", icon: "◎" },
                  inner: { label: "İç Dünya", icon: "◗" },
                  spiritual: { label: "Ruhsal", icon: "✦" },
                  decisions: { label: "Kararlar", icon: "⊹" },
                  healing: { label: "Şifa", icon: "☽" },
                };
                const l = labels[f];
                return l ? (
                  <span
                    key={f}
                    className="px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5"
                    style={{ background: "rgba(212,175,95,0.1)", border: "1px solid rgba(212,175,95,0.25)", color: "var(--gold)" }}
                  >
                    {l.icon} {l.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Deck Selection */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
            Deste Tercihi
          </div>
          <div className="space-y-2">
            {DECK_OPTIONS.map(deck => (
              <button
                key={deck.id}
                onClick={() => handleDeckChange(deck.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                style={{
                  background: profile.deckPreference === deck.id ? "rgba(212,175,95,0.1)" : "transparent",
                  border: `1px solid ${profile.deckPreference === deck.id ? "rgba(212,175,95,0.35)" : "transparent"}`,
                }}
              >
                <span style={{ color: profile.deckPreference === deck.id ? "var(--gold)" : "var(--text-muted)" }}>
                  {deck.icon}
                </span>
                <div>
                  <div className="text-sm font-display-bold" style={{ color: profile.deckPreference === deck.id ? "var(--gold)" : "var(--text-secondary)" }}>
                    {deck.label}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    {deck.desc}
                  </div>
                </div>
                {profile.deckPreference === deck.id && (
                  <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--gold)" }}>
                    <span className="text-[9px] text-black">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Premium CTA */}
        {!!profile.isPurchased && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(107,91,166,0.2), rgba(45,27,94,0.3))",
              border: "1px solid rgba(107,91,166,0.4)",
            }}
          >
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>
              ✦ Premium
            </div>
            <h3 className="font-display text-lg mb-2" style={{ color: "var(--text-primary)" }}>
              Tüm özelliklere eriş
            </h3>
            <ul className="space-y-1 mb-4">
              {[
                "Sınırsız AI destekli okuma",
                "Celtic Cross ve tüm spreadler",
                "Aylık ruhsal analiz",
                "Özel spread oluşturucu",
                "3 farklı deste stili",
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  <span style={{ color: "var(--gold)" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button className="btn-gold w-full">
              Premium&apos;a Geç — ₺149/ay
            </button>
          </div>
        )}

        {/* Account info */}
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
            Hesap Bilgisi
          </div>
          <div className="space-y-2 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>Üyelik tarihi</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {format(joinDate, "d MMMM yyyy", { locale: tr })}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>Deneyim</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {profile.experience === "beginner" ? "Yeni başlayan" :
                 profile.experience === "intermediate" ? "Orta düzey" : "Deneyimli"}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>Plan</span>
              <span style={{ color: !profile.isPurchased ? "var(--gold)" : "var(--text-secondary)" }}>
                {!profile.isPurchased ? "Satın Alındı ✦" : "Ücretsiz"}
              </span>
            </div>
          </div>
        </div>

        {/* Reset */}
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-3 text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
          >
            Profili Sıfırla
          </button>
        ) : (
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              Tüm veriler silinecek. Emin misin?
            </p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => setShowResetConfirm(false)}>
                İptal
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ background: "rgba(201,129,138,0.15)", border: "1px solid rgba(201,129,138,0.3)", color: "var(--rose)", fontFamily: "var(--font-inter)" }}
              >
                Sıfırla
              </button>
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
