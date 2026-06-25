"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { SPREADS, TarotCard, getRandomCards } from "@/lib/tarot-data";
import {
  getProfile, saveProfile, addJournalEntry, updateJournalEntry,
  generateId, buildUserContext, canDoReading, consumeToken, ChatMessage,
} from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import TarotCardDisplay from "@/components/cards/TarotCardDisplay";
import Link from "next/link";

type Phase = "select" | "intention" | "drawing" | "reading" | "chat" | "paywall";

interface DrawnCard {
  card: TarotCard;
  position: string;
  isReversed: boolean;
  isFlipped: boolean;
}

export default function OkumaPage() {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedSpread, setSelectedSpread] = useState<typeof SPREADS[0] | null>(null);
  const [isDeep, setIsDeep] = useState(false);
  const [question, setQuestion] = useState("");
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [currentFlip, setCurrentFlip] = useState(0);
  const [aiReading, setAiReading] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ tokens: number; freeLeft: number } | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getProfile();
    if (p) {
      setTokenInfo({
        tokens: p.tokens,
        freeLeft: Math.max(0, 3 - (p.freeTrialUsed || 0)),
      });
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSelectSpread = (spread: typeof SPREADS[0], deep = false) => {
    const p = getProfile();
    if (!p) return;
    const type = deep ? "deep" : "basic";
    const check = canDoReading(p, type);

    if (!check.allowed) {
      setPhase("paywall");
      return;
    }

    setSelectedSpread(spread);
    setIsDeep(deep);
    setPhase("intention");
  };

  const handleStartDrawing = () => {
    if (!selectedSpread) return;
    const cards = getRandomCards(selectedSpread.cardCount);
    setDrawnCards(cards.map((card, i) => ({
      card,
      position: selectedSpread.positions[i],
      isReversed: Math.random() < 0.3,
      isFlipped: false,
    })));
    setCurrentFlip(0);
    setPhase("drawing");
  };

  const handleFlipCard = (index: number) => {
    if (index !== currentFlip) return;
    setDrawnCards(prev => prev.map((c, i) => i === index ? { ...c, isFlipped: true } : c));
    setCurrentFlip(index + 1);
    if (index === drawnCards.length - 1) {
      setTimeout(() => { setPhase("reading"); fetchReading(); }, 700);
    }
  };

  const fetchReading = async () => {
    if (!selectedSpread) return;
    setIsLoadingAI(true);

    // Token tüket
    const p = getProfile();
    if (p) {
      const updated = consumeToken(p, isDeep ? "deep" : "basic");
      saveProfile(updated);
      setTokenInfo({ tokens: updated.tokens, freeLeft: Math.max(0, 3 - (updated.freeTrialUsed || 0)) });
    }

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "initial",
          cards: drawnCards.map(d => ({ card: d.card, position: d.position, isReversed: d.isReversed })),
          spreadName: selectedSpread.nameTR,
          question: question || undefined,
          userContext: p ? buildUserContext(p) : "",
          isDeep,
        }),
      });
      const data = await res.json();
      setAiReading(data.reading || "Okuma alınamadı.");
    } catch {
      setAiReading("Bağlantı hatası. Kart anlamları aşağıda.");
    }
    setIsLoadingAI(false);
  };

  const handleSave = () => {
    if (!selectedSpread) return;
    const entry = {
      id: generateId(),
      date: new Date().toISOString(),
      spreadType: selectedSpread.id,
      spreadName: selectedSpread.nameTR,
      question: question || undefined,
      cards: drawnCards.map(d => ({ card: d.card, position: d.position, isReversed: d.isReversed })),
      aiReading,
      personalNote,
      mood: 3 as 1 | 2 | 3 | 4 | 5,
      tags: drawnCards.map(d => d.card.suit || d.card.arcana),
      isDeep,
      conversation: chatMessages,
    };
    addJournalEntry(entry);
    setSavedEntryId(entry.id);
  };

  const handleStartChat = () => {
    const initial: ChatMessage = {
      role: "assistant",
      content: `Bu ${selectedSpread?.nameTR} okuması hakkında sormak istediğin bir şey var mı? Herhangi bir kartı ya da genel mesajı daha derine inebiliriz.`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages([initial]);
    setPhase("chat");
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isLoadingChat) return;
    const p = getProfile();
    const userMsg: ChatMessage = { role: "user", content: chatInput, timestamp: new Date().toISOString() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput("");
    setIsLoadingChat(true);

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          conversation: updated.map(m => ({ role: m.role, content: m.content })),
          userContext: p ? buildUserContext(p) : "",
          isDeep,
        }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = { role: "assistant", content: data.reading || "...", timestamp: new Date().toISOString() };
      const final = [...updated, aiMsg];
      setChatMessages(final);
      if (savedEntryId) updateJournalEntry(savedEntryId, { conversation: final });
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Bağlantı kesildi.", timestamp: new Date().toISOString() }]);
    }
    setIsLoadingChat(false);
  };

  const handleReset = () => {
    setPhase("select");
    setSelectedSpread(null);
    setIsDeep(false);
    setQuestion("");
    setDrawnCards([]);
    setAiReading("");
    setPersonalNote("");
    setSavedEntryId(null);
    setChatMessages([]);
    setCurrentFlip(0);
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <StarField count={25} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          {phase !== "select" && (
            <button onClick={handleReset} style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }} className="text-sm">
              ←
            </button>
          )}
          <div>
            <h1 className="font-display text-2xl gradient-gold">
              {phase === "select" ? "Okuma Seç" :
               phase === "chat" ? "Lyra ile Sohbet" :
               selectedSpread?.nameTR || "Okuma"}
            </h1>
            {tokenInfo && phase === "select" && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                {tokenInfo.freeLeft > 0
                  ? `${tokenInfo.freeLeft} ücretsiz deneme hakkın var`
                  : `${tokenInfo.tokens} jetonun var`}
              </p>
            )}
          </div>
        </div>

        {/* ─── SPREAD SEÇ ──────────────────────────────────────── */}
        {phase === "select" && (
          <div className="animate-fadeInUp space-y-3">
            {SPREADS.map(spread => (
              <div key={spread.id}>
                {/* Normal okuma */}
                <button
                  onClick={() => handleSelectSpread(spread, false)}
                  className="w-full p-4 rounded-2xl text-left transition-all group"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,95,0.3)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(212,175,95,0.04)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(212,175,95,0.08)" }}>
                      <Image src={spread.icon} alt={spread.nameTR} width={22} height={22} style={{ objectFit: "contain" }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display-bold text-sm" style={{ color: "var(--text-primary)" }}>
                          {spread.nameTR}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                          · {spread.cardCount} kart · 1 jeton
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        {spread.description}
                      </p>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                  </div>
                </button>

                {/* Derin fal butonu (sadece uygun spreadler için) */}
                {spread.cardCount >= 3 && (
                  <button
                    onClick={() => handleSelectSpread(spread, true)}
                    className="w-full mt-1.5 px-4 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(107,91,166,0.1), rgba(45,27,94,0.12))",
                      border: "1px solid rgba(107,91,166,0.25)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: "var(--indigo-light)" }}>◗</span>
                      <span className="text-xs font-display-bold" style={{ color: "var(--indigo-light)" }}>
                        {spread.nameTR} — Derin Fal
                      </span>
                      <span className="text-xs ml-auto" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        2 jeton · Lyra sohbet dahil
                      </span>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── NİYET ────────────────────────────────────────────── */}
        {phase === "intention" && selectedSpread && (
          <div className="animate-fadeInUp">
            {isDeep && (
              <div className="rounded-2xl p-3 mb-5 flex items-center gap-3"
                style={{ background: "rgba(107,91,166,0.12)", border: "1px solid rgba(107,91,166,0.3)" }}>
                <span style={{ color: "var(--indigo-light)" }}>◗</span>
                <p className="text-xs" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>
                  Derin Fal — Her kart için ayrıntılı yorum + Lyra sohbet dahil
                </p>
              </div>
            )}

            <div className="glass-gold rounded-2xl p-4 mb-5">
              <div className="flex flex-wrap gap-1.5">
                {selectedSpread.positions.map(pos => (
                  <span key={pos} className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(212,175,95,0.1)", color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    {pos}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                Soru ya da niyet (isteğe bağlı)
              </label>
              <textarea className="input-mystic w-full text-sm resize-none"
                placeholder="Bugün aklında ne var? Ne bilmek istiyorsun?"
                rows={3} value={question} onChange={e => setQuestion(e.target.value)} />
            </div>

            <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Derin bir nefes al. Niyetine odaklan.
            </p>
            <button className="btn-gold w-full" onClick={handleStartDrawing}>Kartları Çek ✦</button>
          </div>
        )}

        {/* ─── ÇEKİM ────────────────────────────────────────────── */}
        {phase === "drawing" && (
          <div className="animate-fadeInUp">
            {currentFlip < drawnCards.length ? (
              <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                <span style={{ color: "var(--gold)" }}>{drawnCards[currentFlip].position}</span> kartını aç
              </p>
            ) : (
              <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Yorum hazırlanıyor...
              </p>
            )}

            {drawnCards.length === 1 && (
              <div className="flex justify-center">
                <TarotCardDisplay card={drawnCards[0].card} isRevealed={drawnCards[0].isFlipped}
                  isReversed={drawnCards[0].isReversed} size="xl" position={drawnCards[0].position}
                  onClick={() => handleFlipCard(0)} />
              </div>
            )}
            {drawnCards.length === 3 && (
              <div className="flex justify-center gap-3">
                {drawnCards.map((d, i) => (
                  <TarotCardDisplay key={i} card={d.card} isRevealed={d.isFlipped}
                    isReversed={d.isReversed} size="md" position={d.position}
                    onClick={() => handleFlipCard(i)} animDelay={i * 120} />
                ))}
              </div>
            )}
            {drawnCards.length > 3 && (
              <div className="grid grid-cols-3 gap-2 justify-items-center">
                {drawnCards.map((d, i) => (
                  <TarotCardDisplay key={i} card={d.card} isRevealed={d.isFlipped}
                    isReversed={d.isReversed} size="sm" position={d.position}
                    onClick={() => handleFlipCard(i)} animDelay={i * 80} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── OKUMA ────────────────────────────────────────────── */}
        {phase === "reading" && (
          <div className="animate-fadeInUp">
            {/* Küçük kart özeti */}
            <div className={`flex gap-2 mb-5 overflow-x-auto pb-1 ${drawnCards.length <= 3 ? "justify-center" : ""}`}>
              {drawnCards.map((d, i) => (
                <div key={i} className="flex-shrink-0">
                  <TarotCardDisplay card={d.card} isRevealed isReversed={d.isReversed} size="sm" position={d.position} />
                </div>
              ))}
            </div>

            {/* AI Yorum */}
            <div className="glass-gold rounded-2xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(212,175,95,0.1)" }}>
                  <Image src="/icons/icon-lyra.png" alt="Lyra" width={14} height={14} style={{ objectFit: "contain" }} />
                </div>
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                  Lyra {isDeep ? "— Derin Okuma" : ""}
                </span>
              </div>

              {isLoadingAI ? (
                <div className="space-y-2">
                  {[1, 0.8, 1, 0.6, 0.9].map((w, i) => (
                    <div key={i} className="shimmer h-4 rounded" style={{ width: `${w * 100}%` }} />
                  ))}
                  <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    Lyra okuyor...
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}
                  dangerouslySetInnerHTML={{
                    __html: aiReading.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--gold)">$1</strong>')
                  }}
                />
              )}
            </div>

            {/* Kart detayları */}
            {drawnCards.map((d, i) => (
              <div key={i} className="glass rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.card.color }} />
                  <span className="font-display-bold text-sm" style={{ color: d.card.color }}>{d.card.nameTR}</span>
                  {d.isReversed && (
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(201,129,138,0.12)", color: "var(--rose)", fontFamily: "var(--font-inter)" }}>Ters</span>
                  )}
                  <span className="text-xs ml-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    — {d.position}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {d.isReversed ? d.card.reversed.meaningTR : d.card.upright.meaningTR}
                </p>
              </div>
            ))}

            {/* Kişisel not + kaydet */}
            {!savedEntryId ? (
              <div className="mt-5 mb-4">
                <textarea className="input-mystic w-full text-sm resize-none mb-4"
                  placeholder="Bu okuma sende ne uyandırdı?"
                  rows={2} value={personalNote} onChange={e => setPersonalNote(e.target.value)} />
                <button className="btn-gold w-full mb-3" onClick={handleSave}>Kaydet ◎</button>
              </div>
            ) : (
              <div className="glass rounded-2xl p-3 flex items-center gap-3 mt-5 mb-4">
                <span style={{ color: "var(--gold)" }}>✓</span>
                <span className="text-sm" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>Kaydedildi</span>
              </div>
            )}

            {/* Lyra sohbet CTA */}
            {isDeep && (
              <div className="rounded-2xl p-4 mb-3 text-center"
                style={{ background: "rgba(107,91,166,0.12)", border: "1px solid rgba(107,91,166,0.3)" }}>
                <p className="text-sm mb-3" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>
                  Lyra sohbet bu okumaya dahil — daha derine in
                </p>
                <button className="btn-ghost text-sm px-5 py-2" onClick={handleStartChat}>
                  Sohbete Başla →
                </button>
              </div>
            )}

            <button className="btn-ghost w-full" onClick={handleReset}>Yeni Okuma</button>
          </div>
        )}

        {/* ─── LYRA SOHBET ──────────────────────────────────────── */}
        {phase === "chat" && (
          <div className="animate-fadeInUp flex flex-col" style={{ minHeight: "58vh" }}>
            <div className="flex-1 space-y-4 mb-4 overflow-y-auto" style={{ maxHeight: "52vh" }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1"
                      style={{ background: "rgba(212,175,95,0.2)", fontSize: "10px", color: "var(--gold)" }}>✦</div>
                  )}
                  <div className="rounded-2xl px-4 py-3 max-w-[85%]"
                    style={{
                      background: msg.role === "user" ? "rgba(107,91,166,0.25)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${msg.role === "user" ? "rgba(107,91,166,0.4)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                    style={{ background: "rgba(212,175,95,0.2)", fontSize: "10px", color: "var(--gold)" }}>✦</div>
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
                          style={{ background: "var(--gold)", animationDelay: `${i * 200}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="flex gap-2 sticky bottom-24">
              <input type="text" className="input-mystic flex-1 text-sm"
                placeholder="Lyra'ya sor..."
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChat()} />
              <button onClick={handleSendChat} disabled={!chatInput.trim() || isLoadingChat}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: chatInput.trim() ? "var(--gold)" : "var(--bg-glass)",
                  color: chatInput.trim() ? "#1A0A2E" : "var(--text-muted)",
                  border: "1px solid var(--border-glass)",
                }}>→</button>
            </div>

            <button className="text-xs text-center mt-3 w-full"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
              onClick={() => setPhase("reading")}>
              ← Okumaya dön
            </button>
          </div>
        )}

        {/* ─── PAYWALL ──────────────────────────────────────────── */}
        {phase === "paywall" && (
          <div className="animate-fadeInUp text-center py-6">
            <div className="text-5xl mb-5 animate-float" style={{ filter: "drop-shadow(0 0 20px rgba(212,175,95,0.5))" }}>✦</div>
            <h2 className="font-display text-2xl mb-2" style={{ color: "var(--text-primary)" }}>Ücretsiz denemen doldu</h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Pollux Astro&apos;yu satın alarak 20 jeton kazan ve tüm özelliklere eriş.
            </p>

            <div className="glass-gold rounded-2xl p-5 mb-6 text-left">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ₺199 — Tek Seferlik
              </div>
              {[
                "20 AI okuma jetonu (başlangıç hediyesi)",
                "Tüm spread'ler açık (Celtic Cross dahil)",
                "Lyra ile sohbet her okumada",
                "Günlük ritüel & niyet sistemi",
                "Haftalık spiritüel özet",
                "Sınırsız journal",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{f}</span>
                </div>
              ))}
            </div>

            <button className="btn-gold w-full mb-3">Satın Al — ₺199</button>
            <button className="btn-ghost w-full" onClick={handleReset}>Geri Dön</button>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
