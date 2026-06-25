"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, saveProfile, getJournal, UserProfile } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Navigation from "@/components/layout/Navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getMoonPhase } from "@/lib/tarot-data";
import Image from "next/image";

const DECK_OPTIONS = [
  { id: "classic", label: "Klasik", desc: "Rider-Waite-Smith geleneği" },
  { id: "minimal", label: "Minimal", desc: "Modern çizgi sanatı" },
  { id: "gothic",  label: "Gotik",  desc: "Koyu mistik estetik" },
] as const;

const FOCUS_LABELS: Record<string, { label: string; icon: string }> = {
  love: { label: "Aşk", icon: "/icons/spread-love.png" },
  career: { label: "Kariyer", icon: "/icons/suit-pentacles.png" },
  inner: { label: "İç Dünya", icon: "/icons/spread-shadow.png" },
  spiritual: { label: "Ruhsal", icon: "/icons/suit-major.png" },
  decisions: { label: "Kararlar", icon: "/icons/spread-single.png" },
  healing: { label: "Şifa", icon: "/icons/moon-full.png" },
};

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [journalCount, setJournalCount] = useState(0);
  const [moonPhase] = useState(getMoonPhase());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => { setProfile(getProfile()); setJournalCount(getJournal().length); }, []);

  const handleDeckChange = (deck: UserProfile["deckPreference"]) => {
    if (!profile) return;
    const updated = { ...profile, deckPreference: deck };
    saveProfile(updated); setProfile(updated);
  };

  const handleReset = () => { if (typeof window !== "undefined") { localStorage.clear(); router.push("/onboarding"); } };

  if (!profile) return null;

  const joinDate = new Date(profile.createdAt);
  const daysSince = Math.floor((Date.now() - joinDate.getTime()) / 86400000);

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <div className="relative z-10 max-w-md mx-auto px-6 pt-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl gradient-gold">{profile.name}</h1>
          {profile.primaryBirthCard && (
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {profile.primaryBirthCard.nameTR} doğum kartlı
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-8">
          <div>
            <p className="font-display text-2xl gradient-gold">{profile.streak || 0}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Image src="/icons/icon-streak.png" alt="streak" width={11} height={11} style={{ objectFit: "contain" }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Seri</span>
            </div>
          </div>
          <div>
            <p className="font-display text-2xl gradient-gold">{journalCount}</p>
            <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Okuma</p>
          </div>
          <div>
            <p className="font-display text-2xl gradient-gold">{daysSince}</p>
            <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Gün</p>
          </div>
        </div>

        <div className="aether-line" />

        {/* Doğum kartı */}
        {profile.primaryBirthCard && (
          <>
            <div className="aether-label">Doğum Kartın</div>
            <div className="flex items-start gap-4 mb-2">
              <div>
                <p className="font-display text-xl mb-1" style={{ color: profile.primaryBirthCard.color }}>
                  {profile.primaryBirthCard.nameTR}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                  {profile.primaryBirthCard.upright.meaningTR.split(".")[0]}.
                </p>
                {profile.secondaryBirthCard && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    İkincil: <span style={{ color: "var(--gold)" }}>{profile.secondaryBirthCard.nameTR}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="aether-line" />
          </>
        )}

        {/* Ay fazı */}
        <div className="aether-label">Şu An</div>
        <div className="flex items-center gap-3 mb-2">
          <Image src={moonPhase.icon} alt={moonPhase.name} width={32} height={32} style={{ objectFit: "contain" }} />
          <div>
            <p className="font-display-bold text-sm" style={{ color: "var(--text-primary)" }}>{moonPhase.name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{moonPhase.energy}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>→ {moonPhase.spreadSuggestion}</p>
          </div>
        </div>

        <div className="aether-line" />

        {/* Odak alanları */}
        {profile.focus?.length > 0 && (
          <>
            <div className="aether-label">Odak Alanların</div>
            <div className="flex flex-wrap gap-4 mb-4">
              {profile.focus.map(f => {
                const l = FOCUS_LABELS[f];
                return l ? (
                  <div key={f} className="flex items-center gap-1.5">
                    <Image src={l.icon} alt={l.label} width={16} height={16} style={{ objectFit: "contain", opacity: 0.7 }} />
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{l.label}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="aether-line" />
          </>
        )}

        {/* Deste */}
        <div className="aether-label">Deste Tercihi</div>
        <div className="aether-options mb-6">
          {DECK_OPTIONS.map(deck => (
            <button key={deck.id} onClick={() => handleDeckChange(deck.id)}
              className={`aether-option ${profile.deckPreference === deck.id ? "active" : ""}`}>
              <span className="aether-option-label">{deck.label}</span>
            </button>
          ))}
        </div>

        <div className="aether-line" />

        {/* Premium */}
        {!profile.isPurchased && (
          <>
            <div className="aether-label">Plan</div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display text-lg" style={{ color: "var(--text-primary)" }}>Ücretsiz</p>
                <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{Math.max(0, 3 - (profile.freeTrialUsed || 0))} deneme hakkı kaldı</p>
              </div>
              <button className="btn-aether" style={{ width: "auto", padding: "10px 20px", fontSize: "13px" }}>
                ₺199&apos;a Geç
              </button>
            </div>
            <div className="aether-line" />
          </>
        )}

        {/* Hesap */}
        <div className="aether-label">Hesap</div>
        <div className="aether-row">
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Üyelik</span>
          <span className="text-xs ml-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{format(joinDate, "d MMMM yyyy", { locale: tr })}</span>
        </div>
        <div className="aether-row">
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Deneyim</span>
          <span className="text-xs ml-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
            {profile.experience === "beginner" ? "Yeni başlayan" : profile.experience === "intermediate" ? "Orta düzey" : "Deneyimli"}
          </span>
        </div>

        <div className="aether-line" />

        {!showResetConfirm ? (
          <button onClick={() => setShowResetConfirm(true)} className="btn-aether-ghost">Profili Sıfırla</button>
        ) : (
          <div>
            <p className="text-sm text-center mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>Tüm veriler silinecek. Emin misin?</p>
            <div className="flex gap-4">
              <button className="btn-aether-ghost flex-1" onClick={() => setShowResetConfirm(false)}>İptal</button>
              <button onClick={handleReset} className="flex-1 btn-aether" style={{ borderColor: "rgba(201,129,138,0.4)", color: "var(--rose)" }}>Sıfırla</button>
            </div>
          </div>
        )}
      </div>
      <Navigation />
    </main>
  );
}
