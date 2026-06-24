"use client";

import { useState } from "react";
import { SPREADS, TAROT_CARDS, TarotCard, getRandomCards } from "@/lib/tarot-data";
import { getProfile, addJournalEntry, generateId } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import TarotCardDisplay from "@/components/cards/TarotCardDisplay";

type ReadingPhase = "select-spread" | "set-intention" | "drawing" | "reading" | "saved";

interface DrawnCard {
  card: TarotCard;
  position: string;
  isReversed: boolean;
  isFlipped: boolean;
}

export default function OkumaPage() {
  const profile = getProfile();
  const [phase, setPhase] = useState<ReadingPhase>("select-spread");
  const [selectedSpread, setSelectedSpread] = useState<typeof SPREADS[0] | null>(null);
  const [question, setQuestion] = useState("");
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [currentFlip, setCurrentFlip] = useState(0);
  const [aiReading, setAiReading] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleSelectSpread = (spread: typeof SPREADS[0]) => {
    setSelectedSpread(spread);
    setPhase("set-intention");
  };

  const handleStartDrawing = () => {
    if (!selectedSpread) return;
    const cards = getRandomCards(selectedSpread.cardCount);
    const drawn: DrawnCard[] = cards.map((card, i) => ({
      card,
      position: selectedSpread.positions[i],
      isReversed: Math.random() < 0.3,
      isFlipped: false,
    }));
    setDrawnCards(drawn);
    setCurrentFlip(0);
    setPhase("drawing");
  };

  const handleFlipCard = (index: number) => {
    if (index !== currentFlip) return;
    setDrawnCards(prev =>
      prev.map((c, i) => i === index ? { ...c, isFlipped: true } : c)
    );
    setCurrentFlip(index + 1);

    if (index === drawnCards.length - 1) {
      setTimeout(() => {
        setPhase("reading");
        fetchAIReading();
      }, 800);
    }
  };

  const fetchAIReading = async () => {
    if (!selectedSpread) return;
    setIsLoadingAI(true);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: drawnCards.map(d => ({
            card: d.card,
            position: d.position,
            isReversed: d.isReversed,
          })),
          spreadName: selectedSpread.nameTR,
          positions: selectedSpread.positions,
          question: question || undefined,
          focus: profile?.focus || [],
          userName: profile?.name || "Yolcu",
        }),
      });
      const data = await res.json();
      setAiReading(data.reading || "Okuma alınamadı.");
    } catch {
      setAiReading("Bağlantı hatası. Lütfen tekrar dene.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSave = () => {
    if (!selectedSpread) return;
    const entry = {
      id: generateId(),
      date: new Date().toISOString(),
      spreadType: selectedSpread.id,
      spreadName: selectedSpread.nameTR,
      question,
      cards: drawnCards.map(d => ({
        card: d.card,
        position: d.position,
        isReversed: d.isReversed,
      })),
      aiReading,
      personalNote,
      mood: 3 as 1 | 2 | 3 | 4 | 5,
      tags: drawnCards.map(d => d.card.arcana),
    };
    addJournalEntry(entry);
    setIsSaved(true);
    setPhase("saved");
  };

  const handleReset = () => {
    setPhase("select-spread");
    setSelectedSpread(null);
    setQuestion("");
    setDrawnCards([]);
    setAiReading("");
    setPersonalNote("");
    setIsSaved(false);
    setCurrentFlip(0);
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-24">
      <AmbientOrbs />
      <StarField count={30} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-12">
        {/* Header */}
        <div className="mb-8">
          {phase !== "select-spread" && (
            <button
              onClick={handleReset}
              className="text-sm mb-4 flex items-center gap-2"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
            >
              ← Geri
            </button>
          )}
          <h1 className="font-display text-3xl gradient-gold">
            {phase === "select-spread" ? "Okuma Seç" :
             phase === "set-intention" ? selectedSpread?.nameTR :
             phase === "drawing" ? "Kartları Çek" :
             phase === "reading" ? "Okumanın" :
             "Kaydedildi"}
          </h1>
        </div>

        {/* SELECT SPREAD */}
        {phase === "select-spread" && (
          <div className="animate-fadeInUp">
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Hangi okumayı yapmak istiyorsun?
            </p>
            <div className="flex flex-col gap-3">
              {SPREADS.map(spread => (
                <button
                  key={spread.id}
                  onClick={() => handleSelectSpread(spread)}
                  className="w-full p-4 rounded-2xl text-left transition-all group"
                  style={{
                    background: "var(--bg-glass)",
                    border: "1px solid var(--border-glass)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(212,175,95,0.3)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(212,175,95,0.05)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid var(--border-glass)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)";
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: "rgba(212,175,95,0.1)", color: "var(--gold)" }}
                    >
                      {spread.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display-bold" style={{ color: "var(--text-primary)" }}>
                          {spread.nameTR}
                        </span>
                        {spread.tier === "premium" && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(212,175,95,0.15)", color: "var(--gold)", fontFamily: "var(--font-inter)" }}
                          >
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        {spread.description} · {spread.cardCount} kart
                      </p>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SET INTENTION */}
        {phase === "set-intention" && selectedSpread && (
          <div className="animate-fadeInUp">
            <div className="glass-gold rounded-2xl p-5 mb-6">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                {selectedSpread.icon} {selectedSpread.name}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                {selectedSpread.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedSpread.positions.map(pos => (
                  <span
                    key={pos}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(212,175,95,0.1)",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                Niyetini belirle (isteğe bağlı)
              </label>
              <textarea
                className="input-mystic w-full text-sm resize-none"
                placeholder="Bugün hangi soruyu ya da niyeti taşıyorsun? Örn: 'Bu ilişkide nerede duruyorum?'"
                rows={3}
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
            </div>

            <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Derin bir nefes al. Niyetine odaklan.
            </p>

            <button className="btn-gold w-full" onClick={handleStartDrawing}>
              Kartları Çek ✦
            </button>
          </div>
        )}

        {/* DRAWING PHASE */}
        {phase === "drawing" && (
          <div className="animate-fadeInUp">
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {currentFlip < drawnCards.length
                ? `${drawnCards[currentFlip].position} kartını aç`
                : "Tüm kartlar açıldı..."}
            </p>

            {selectedSpread?.cardCount === 1 ? (
              // Single card layout
              <div className="flex justify-center">
                {drawnCards.map((drawn, i) => (
                  <TarotCardDisplay
                    key={i}
                    card={drawn.card}
                    isRevealed={drawn.isFlipped}
                    isReversed={drawn.isReversed}
                    size="xl"
                    position={drawn.position}
                    onClick={() => handleFlipCard(i)}
                    animDelay={i * 100}
                  />
                ))}
              </div>
            ) : selectedSpread?.cardCount === 3 ? (
              // Three card layout
              <div className="flex justify-center gap-4">
                {drawnCards.map((drawn, i) => (
                  <TarotCardDisplay
                    key={i}
                    card={drawn.card}
                    isRevealed={drawn.isFlipped}
                    isReversed={drawn.isReversed}
                    size="md"
                    position={drawn.position}
                    onClick={() => handleFlipCard(i)}
                    animDelay={i * 150}
                  />
                ))}
              </div>
            ) : (
              // Grid layout for larger spreads
              <div className="grid grid-cols-3 gap-3 justify-items-center">
                {drawnCards.map((drawn, i) => (
                  <TarotCardDisplay
                    key={i}
                    card={drawn.card}
                    isRevealed={drawn.isFlipped}
                    isReversed={drawn.isReversed}
                    size="sm"
                    position={drawn.position}
                    onClick={() => handleFlipCard(i)}
                    animDelay={i * 100}
                  />
                ))}
              </div>
            )}

            {currentFlip > 0 && currentFlip < drawnCards.length && (
              <p className="text-center mt-6 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                {drawnCards.length - currentFlip} kart daha
              </p>
            )}
          </div>
        )}

        {/* READING PHASE */}
        {phase === "reading" && (
          <div className="animate-fadeInUp">
            {/* Cards overview */}
            <div className={`flex gap-2 mb-6 overflow-x-auto pb-2 ${drawnCards.length <= 3 ? "justify-center" : ""}`}>
              {drawnCards.map((drawn, i) => (
                <div key={i} className="flex-shrink-0">
                  <TarotCardDisplay
                    card={drawn.card}
                    isRevealed={true}
                    isReversed={drawn.isReversed}
                    size="sm"
                    position={drawn.position}
                  />
                </div>
              ))}
            </div>

            {/* AI Reading */}
            <div className="glass-gold rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">✦</span>
                <div className="text-xs uppercase tracking-widest" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                  Ruhsal Yorum
                </div>
              </div>

              {isLoadingAI ? (
                <div className="space-y-2">
                  <div className="shimmer h-4 rounded w-full" />
                  <div className="shimmer h-4 rounded w-5/6" />
                  <div className="shimmer h-4 rounded w-full" />
                  <div className="shimmer h-4 rounded w-4/6" />
                  <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    Evren okuma yapıyor...
                  </p>
                </div>
              ) : (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}
                  dangerouslySetInnerHTML={{
                    __html: aiReading
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--gold)">$1</strong>')
                  }}
                />
              )}
            </div>

            {/* Individual card details */}
            {drawnCards.map((drawn, i) => (
              <div key={i} className="glass rounded-2xl p-4 mb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${drawn.card.color}20`, color: drawn.card.color }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display-bold" style={{ color: drawn.card.color }}>
                        {drawn.card.nameTR}
                      </span>
                      {drawn.isReversed && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,129,138,0.15)", color: "var(--rose)", fontFamily: "var(--font-inter)" }}>
                          Ters
                        </span>
                      )}
                    </div>
                    <div className="text-xs mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      {drawn.position}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                      {drawn.isReversed ? drawn.card.reversed.meaningTR : drawn.card.upright.meaningTR}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Personal note */}
            <div className="mt-6 mb-4">
              <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                Kişisel notun (isteğe bağlı)
              </label>
              <textarea
                className="input-mystic w-full text-sm resize-none"
                placeholder="Bu okuma sende ne uyandırdı?"
                rows={3}
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
              />
            </div>

            <button className="btn-gold w-full mb-3" onClick={handleSave}>
              Günlüğe Kaydet ◎
            </button>
            <button className="btn-ghost w-full" onClick={handleReset}>
              Yeni Okuma
            </button>
          </div>
        )}

        {/* SAVED */}
        {phase === "saved" && (
          <div className="text-center animate-fadeInUp py-8">
            <div className="text-6xl mb-4 animate-float" style={{ filter: "drop-shadow(0 0 20px rgba(212,175,95,0.5))" }}>
              ✦
            </div>
            <h2 className="font-display text-2xl mb-2 gradient-gold">Okuma Kaydedildi</h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Bu okumayı günlüğünde bulabilirsin.
            </p>
            <button className="btn-primary w-full mb-3" onClick={handleReset}>
              Yeni Okuma Yap
            </button>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
