"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateBirthCards, getDailyCard } from "@/lib/tarot-data";
import {
  UserProfile,
  saveProfile,
  setOnboarded,
  generateId,
} from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";

const FOCUS_OPTIONS = [
  { id: "love", label: "Aşk & İlişkiler", icon: "♡" },
  { id: "career", label: "Kariyer & Para", icon: "◎" },
  { id: "inner", label: "İç Dünya", icon: "◗" },
  { id: "spiritual", label: "Ruhsal Büyüme", icon: "✦" },
  { id: "decisions", label: "Kararlar", icon: "⊹" },
  { id: "healing", label: "Şifa & İyileşme", icon: "☽" },
];

const EXPERIENCE_OPTIONS = [
  { id: "beginner", label: "Yeni Başlıyorum", desc: "Tarotla ilk tanışmam", icon: "🌱" },
  { id: "intermediate", label: "Biraz Tanıyorum", desc: "Bazı kartları biliyorum", icon: "🌿" },
  { id: "advanced", label: "Deneyimliyim", desc: "Düzenli okuma yapıyorum", icon: "🌳" },
];

const STEPS = [
  "welcome",
  "name",
  "birthdate",
  "experience",
  "focus",
  "birth-card-reveal",
] as const;

type Step = (typeof STEPS)[number];

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
      setTimeout(() => {
        setStep(STEPS[idx + 1]);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleBirthDateContinue = () => {
    if (birthDate) {
      const cards = calculateBirthCards(new Date(birthDate));
      setBirthCard(cards);
      goNext();
    }
  };

  const handleFinish = () => {
    if (!birthCard) return;
    const profile: UserProfile = {
      id: generateId(),
      name,
      birthDate,
      focus: selectedFocus,
      experience,
      primaryBirthCard: birthCard.primary,
      secondaryBirthCard: birthCard.secondary,
      deckPreference: "classic",
      isPremium: false,
      createdAt: new Date().toISOString(),
      streak: 0,
    };
    saveProfile(profile);
    setOnboarded();
    router.push("/daily");
  };

  const toggleFocus = (id: string) => {
    setSelectedFocus(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AmbientOrbs />
      <StarField count={60} />

      <div
        className="relative z-10 w-full max-w-md mx-auto px-6 py-12"
        style={{ opacity: isAnimating ? 0 : 1, transition: "opacity 0.3s" }}
      >
        {/* Progress dots */}
        {step !== "welcome" && step !== "birth-card-reveal" && (
          <div className="flex justify-center gap-2 mb-10">
            {["name", "birthdate", "experience", "focus"].map((s, i) => (
              <div
                key={s}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: ["name", "birthdate", "experience", "focus"].indexOf(step) >= i
                    ? "var(--gold)"
                    : "rgba(255,255,255,0.2)",
                  width: s === step ? "24px" : "6px",
                }}
              />
            ))}
          </div>
        )}

        {/* WELCOME */}
        {step === "welcome" && (
          <div className="text-center animate-fadeInUp">
            <div className="text-6xl mb-6 animate-float" style={{ filter: "drop-shadow(0 0 20px rgba(212,175,95,0.6))" }}>
              ✦
            </div>
            <h1 className="font-display text-4xl mb-3" style={{ color: "var(--text-primary)", letterSpacing: "0.08em" }}>
              Pollux Astro
            </h1>
            <div className="w-16 h-px mx-auto mb-4" style={{ background: "var(--gold)" }} />
            <p className="text-lg mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              Evrenin aynasında kendini keşfet
            </p>
            <p className="text-sm mb-10 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Tarot bir kehanet değil, iç dünyanın haritası. Her kart, zaten bildiğin ama görmediğin gerçeği gösteriyor.
            </p>
            <button className="btn-gold w-full" onClick={goNext}>
              Yolculuğa Başla
            </button>
            <p className="mt-4 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Verileriniz yalnızca cihazınızda saklanır
            </p>
          </div>
        )}

        {/* NAME */}
        {step === "name" && (
          <div className="animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4" style={{ color: "var(--gold)" }}>☽</div>
              <h2 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
                Adın nedir?
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Evren seni nasıl çağırıyor?
              </p>
            </div>
            <input
              type="text"
              className="input-mystic w-full mb-6 text-lg text-center"
              placeholder="İsmini yaz..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && goNext()}
              autoFocus
            />
            <button
              className="btn-primary w-full"
              onClick={goNext}
              disabled={!name.trim()}
              style={{ opacity: name.trim() ? 1 : 0.4 }}
            >
              Devam
            </button>
          </div>
        )}

        {/* BIRTHDATE */}
        {step === "birthdate" && (
          <div className="animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4" style={{ color: "var(--gold)" }}>✦</div>
              <h2 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
                Doğum tarihin?
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Doğum kartlarını ve kişisel enerjini hesaplamak için kullanılır.
              </p>
            </div>
            <input
              type="date"
              className="input-mystic w-full mb-6 text-lg text-center"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
            <button
              className="btn-primary w-full"
              onClick={handleBirthDateContinue}
              disabled={!birthDate}
              style={{ opacity: birthDate ? 1 : 0.4 }}
            >
              Kartımı Hesapla
            </button>
            <button
              className="btn-ghost w-full mt-3"
              onClick={goNext}
            >
              Şimdilik atla
            </button>
          </div>
        )}

        {/* EXPERIENCE */}
        {step === "experience" && (
          <div className="animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4" style={{ color: "var(--gold)" }}>⊹</div>
              <h2 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
                Tarot deneyimin?
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Sana en uygun içeriği sunalım.
              </p>
            </div>
            <div className="flex flex-col gap-3 mb-8">
              {EXPERIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setExperience(opt.id as UserProfile["experience"])}
                  className="w-full p-4 rounded-2xl text-left transition-all"
                  style={{
                    background: experience === opt.id ? "rgba(212, 175, 95, 0.12)" : "var(--bg-glass)",
                    border: `1px solid ${experience === opt.id ? "rgba(212, 175, 95, 0.4)" : "var(--border-glass)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="font-display-bold text-base" style={{ color: "var(--text-primary)" }}>
                        {opt.label}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        {opt.desc}
                      </div>
                    </div>
                    {experience === opt.id && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--gold)" }}>
                        <span className="text-xs text-black">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button className="btn-primary w-full" onClick={goNext}>
              Devam
            </button>
          </div>
        )}

        {/* FOCUS */}
        {step === "focus" && (
          <div className="animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4" style={{ color: "var(--gold)" }}>◎</div>
              <h2 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
                Ne arıyorsun?
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                En fazla 3 alan seçebilirsin.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {FOCUS_OPTIONS.map(opt => {
                const isSelected = selectedFocus.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleFocus(opt.id)}
                    className="p-4 rounded-2xl transition-all"
                    style={{
                      background: isSelected ? "rgba(212, 175, 95, 0.12)" : "var(--bg-glass)",
                      border: `1px solid ${isSelected ? "rgba(212, 175, 95, 0.4)" : "var(--border-glass)"}`,
                      opacity: !isSelected && selectedFocus.length >= 3 ? 0.4 : 1,
                    }}
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <div
                      className="text-sm font-display-bold"
                      style={{ color: isSelected ? "var(--gold)" : "var(--text-secondary)" }}
                    >
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              className="btn-gold w-full"
              onClick={birthCard ? () => setStep("birth-card-reveal") : handleFinish}
              disabled={selectedFocus.length === 0}
              style={{ opacity: selectedFocus.length > 0 ? 1 : 0.4 }}
            >
              {birthCard ? "Kartımı Gör" : "Başla"}
            </button>
          </div>
        )}

        {/* BIRTH CARD REVEAL */}
        {step === "birth-card-reveal" && birthCard && (
          <div className="animate-fadeInUp text-center">
            <p className="text-sm mb-2 uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {name}, senin doğum kartın
            </p>
            <h2 className="font-display text-4xl mb-6 gradient-gold">
              {birthCard.primary.nameTR}
            </h2>

            {/* Card Visual */}
            <div className="mx-auto mb-6 relative" style={{ width: "160px", height: "240px" }}>
              <div
                className="w-full h-full rounded-2xl flex flex-col items-center justify-center glow-gold"
                style={{
                  background: `linear-gradient(165deg, ${birthCard.primary.color}33, #1A0A2E)`,
                  border: `2px solid ${birthCard.primary.color}55`,
                }}
              >
                <div className="text-6xl mb-3" style={{ filter: `drop-shadow(0 0 20px ${birthCard.primary.color})` }}>
                  ✦
                </div>
                <div
                  className="font-display text-xl text-center px-3"
                  style={{ color: birthCard.primary.color }}
                >
                  {birthCard.primary.nameTR}
                </div>
                <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {typeof birthCard.primary.number === "number" ? `Arkana ${birthCard.primary.number}` : ""}
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {birthCard.primary.keywordsTR.map(kw => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-full text-xs uppercase tracking-wide"
                  style={{
                    background: `${birthCard.primary.color}18`,
                    border: `1px solid ${birthCard.primary.color}40`,
                    color: birthCard.primary.color,
                    fontFamily: "var(--font-inter)",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>

            {/* Meaning */}
            <div
              className="glass-gold rounded-2xl p-4 mb-6 text-left"
            >
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                {birthCard.primary.upright.meaningTR}
              </p>
            </div>

            {birthCard.secondary && (
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                İkincil kartın: <span style={{ color: "var(--gold)" }}>{birthCard.secondary.nameTR}</span>
              </p>
            )}

            <button className="btn-gold w-full" onClick={handleFinish}>
              Yolculuğuma Başla ✦
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
