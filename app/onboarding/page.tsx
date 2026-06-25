"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateBirthCards } from "@/lib/tarot-data";
import { UserProfile, saveProfile, setOnboarded, generateId } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Logo from "@/components/ui/Logo";

const FOCUS_OPTIONS = [
  { id: "love",      label: "Aşk & İlişkiler" },
  { id: "career",    label: "Kariyer & Para" },
  { id: "inner",     label: "İç Dünya" },
  { id: "spiritual", label: "Ruhsal Büyüme" },
  { id: "decisions", label: "Kararlar" },
  { id: "healing",   label: "Şifa" },
];

const EXPERIENCE_OPTIONS = [
  { id: "beginner",     label: "Yeni Başlıyorum",  desc: "Tarotla ilk tanışmam" },
  { id: "intermediate", label: "Biraz Tanıyorum",  desc: "Bazı kartları biliyorum" },
  { id: "advanced",     label: "Deneyimliyim",     desc: "Düzenli okuma yapıyorum" },
];

const STEPS = ["welcome", "name", "birthdate", "experience", "focus", "birth-card-reveal"] as const;
type Step = typeof STEPS[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [experience, setExperience] = useState<UserProfile["experience"]>("beginner");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [birthCard, setBirthCard] = useState<ReturnType<typeof calculateBirthCards> | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => { setStep(STEPS[idx + 1]); setIsAnimating(false); }, 250);
    }
  };

  const handleBirthDateContinue = () => {
    if (birthDate) { setBirthCard(calculateBirthCards(new Date(birthDate))); goNext(); }
  };

  const handleFinish = () => {
    if (!birthCard) return;
    const profile: UserProfile = {
      id: generateId(), name, birthDate, focus: selectedFocus, experience,
      primaryBirthCard: birthCard.primary, secondaryBirthCard: birthCard.secondary,
      deckPreference: "classic", isPurchased: false, tokens: 0, freeTrialUsed: 0,
      createdAt: new Date().toISOString(), streak: 0,
    };
    saveProfile(profile); setOnboarded(); router.push("/daily");
  };

  const toggleFocus = (id: string) => {
    setSelectedFocus(prev => prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const progressSteps = ["name", "birthdate", "experience", "focus"];
  const progressIdx = progressSteps.indexOf(step);

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AmbientOrbs />
      <div className="relative z-10 w-full max-w-sm mx-auto px-6 py-12"
        style={{ opacity: isAnimating ? 0 : 1, transition: "opacity 0.25s" }}>

        {/* Progress */}
        {progressIdx >= 0 && (
          <div className="flex gap-2 justify-center mb-12">
            {progressSteps.map((s, i) => (
              <div key={s} className="transition-all" style={{
                height: "1px",
                background: i <= progressIdx ? "var(--gold)" : "rgba(255,255,255,0.15)",
                width: s === step ? "32px" : "16px",
              }} />
            ))}
          </div>
        )}

        {/* WELCOME */}
        {step === "welcome" && (
          <div className="text-center animate-fadeInUp">
            <div className="flex justify-center mb-8 animate-float">
              <Logo size={72} showWordmark />
            </div>
            <div className="aether-line" />
            <p className="text-base mb-2 leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              Evrenin aynasında kendini keşfet
            </p>
            <p className="text-sm mb-10 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Tarot bir kehanet değil, iç dünyanın haritası.
            </p>
            <button className="btn-aether-solid" onClick={goNext}>Yolculuğa Başla</button>
            <p className="mt-4 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Verileriniz yalnızca cihazınızda saklanır
            </p>
          </div>
        )}

        {/* NAME */}
        {step === "name" && (
          <div className="animate-fadeInUp">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Adın</p>
            <h2 className="font-display text-4xl mb-8" style={{ color: "var(--text-primary)" }}>Evren seni nasıl çağırıyor?</h2>
            <div className="aether-line" />
            <input type="text" className="input-aether text-xl mb-10" placeholder="İsmini yaz..." value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && name.trim() && goNext()} autoFocus />
            <button className="btn-aether-solid" onClick={goNext} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.3 }}>Devam</button>
          </div>
        )}

        {/* BIRTHDATE */}
        {step === "birthdate" && (
          <div className="animate-fadeInUp">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Doğum Tarihi</p>
            <h2 className="font-display text-4xl mb-3" style={{ color: "var(--text-primary)" }}>Doğum kartını hesaplayalım</h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Yalnızca doğum kartın için kullanılır.</p>
            <div className="aether-line" />
            <input type="date" className="input-aether text-lg mb-10" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
            <button className="btn-aether-solid mb-3" onClick={handleBirthDateContinue} disabled={!birthDate} style={{ opacity: birthDate ? 1 : 0.3 }}>Kartımı Hesapla</button>
            <button className="btn-aether-ghost" onClick={goNext}>Şimdilik atla</button>
          </div>
        )}

        {/* EXPERIENCE */}
        {step === "experience" && (
          <div className="animate-fadeInUp">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Deneyim</p>
            <h2 className="font-display text-4xl mb-8" style={{ color: "var(--text-primary)" }}>Tarot deneyimin?</h2>
            <div className="aether-line" />
            {EXPERIENCE_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setExperience(opt.id as UserProfile["experience"])}
                className="w-full text-left py-4 flex items-center justify-between transition-opacity"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "none", cursor: "pointer" }}>
                <div>
                  <p className="font-display-bold text-base" style={{ color: experience === opt.id ? "var(--gold)" : "var(--text-primary)" }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{opt.desc}</p>
                </div>
                {experience === opt.id && <span style={{ color: "var(--gold)", fontSize: "12px" }}>✦</span>}
              </button>
            ))}
            <div style={{ height: "32px" }} />
            <button className="btn-aether-solid" onClick={goNext}>Devam</button>
          </div>
        )}

        {/* FOCUS */}
        {step === "focus" && (
          <div className="animate-fadeInUp">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Odak</p>
            <h2 className="font-display text-4xl mb-3" style={{ color: "var(--text-primary)" }}>Ne arıyorsun?</h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>En fazla 3 alan seç.</p>
            <div className="aether-line" />
            {FOCUS_OPTIONS.map(opt => {
              const isSelected = selectedFocus.includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleFocus(opt.id)}
                  className="w-full text-left py-4 flex items-center justify-between transition-all"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "none", cursor: "pointer", opacity: !isSelected && selectedFocus.length >= 3 ? 0.3 : 1 }}>
                  <span className="font-display-bold text-base" style={{ color: isSelected ? "var(--gold)" : "var(--text-primary)" }}>{opt.label}</span>
                  {isSelected && <span style={{ color: "var(--gold)", fontSize: "12px" }}>✦</span>}
                </button>
              );
            })}
            <div style={{ height: "32px" }} />
            <button className="btn-aether-solid" onClick={birthCard ? () => { const idx = STEPS.indexOf(step); setStep(STEPS[idx + 1]); } : handleFinish} disabled={selectedFocus.length === 0} style={{ opacity: selectedFocus.length > 0 ? 1 : 0.3 }}>
              {birthCard ? "Kartımı Gör" : "Başla"}
            </button>
          </div>
        )}

        {/* BIRTH CARD REVEAL */}
        {step === "birth-card-reveal" && birthCard && (
          <div className="animate-fadeInUp text-center">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{name}, senin doğum kartın</p>
            <h2 className="font-display text-4xl gradient-gold mb-8">{birthCard.primary.nameTR}</h2>
            <div className="aether-line" />
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {birthCard.primary.keywordsTR.map(kw => (
                <span key={kw} className="text-xs uppercase tracking-wide" style={{ color: birthCard.primary.color, fontFamily: "var(--font-inter)" }}>{kw}</span>
              )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`s${i}`} style={{ color: "var(--text-muted)" }}> · </span>, el], [] as React.ReactNode[])}
            </div>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              {birthCard.primary.upright.meaningTR}
            </p>
            {birthCard.secondary && (
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                İkincil kartın: <span style={{ color: "var(--gold)" }}>{birthCard.secondary.nameTR}</span>
              </p>
            )}
            <button className="btn-aether-solid" onClick={handleFinish}>Yolculuğuma Başla</button>
          </div>
        )}
      </div>
    </main>
  );
}
