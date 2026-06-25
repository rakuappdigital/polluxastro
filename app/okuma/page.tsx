"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { SPREADS, TarotCard, getRandomCards } from "@/lib/tarot-data";
import { getProfile, saveProfile, addJournalEntry, updateJournalEntry, generateId, buildUserContext, canDoReading, consumeToken, ChatMessage } from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Navigation from "@/components/layout/Navigation";
import TarotCardDisplay from "@/components/cards/TarotCardDisplay";
import Link from "next/link";

type Phase = "select" | "intention" | "drawing" | "reading" | "chat" | "paywall";

interface DrawnCard { card: TarotCard; position: string; isReversed: boolean; isFlipped: boolean; }

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getProfile();
    if (p) setTokenInfo({ tokens: p.tokens, freeLeft: Math.max(0, 3 - (p.freeTrialUsed || 0)) });
  }, []);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSelectSpread = (spread: typeof SPREADS[0], deep = false) => {
    const p = getProfile();
    if (!p) return;
    if (!canDoReading(p, deep ? "deep" : "basic").allowed) { setPhase("paywall"); return; }
    setSelectedSpread(spread); setIsDeep(deep); setPhase("intention");
  };

  const handleStartDrawing = () => {
    if (!selectedSpread) return;
    const cards = getRandomCards(selectedSpread.cardCount);
    setDrawnCards(cards.map((card, i) => ({ card, position: selectedSpread.positions[i], isReversed: Math.random() < 0.3, isFlipped: false })));
    setCurrentFlip(0); setPhase("drawing");
  };

  const handleFlipCard = (index: number) => {
    if (index !== currentFlip) return;
    setDrawnCards(prev => prev.map((c, i) => i === index ? { ...c, isFlipped: true } : c));
    setCurrentFlip(index + 1);
    if (index === drawnCards.length - 1) setTimeout(() => { setPhase("reading"); fetchReading(); }, 700);
  };

  const fetchReading = async () => {
    if (!selectedSpread) return;
    setIsLoadingAI(true);
    const p = getProfile();
    if (p) { const u = consumeToken(p, isDeep ? "deep" : "basic"); saveProfile(u); setTokenInfo({ tokens: u.tokens, freeLeft: Math.max(0, 3 - (u.freeTrialUsed || 0)) }); }
    try {
      const res = await fetch("/api/reading", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "initial", cards: drawnCards.map(d => ({ card: d.card, position: d.position, isReversed: d.isReversed })), spreadName: selectedSpread.nameTR, question: question || undefined, userContext: p ? buildUserContext(p) : "", isDeep }) });
      const data = await res.json();
      setAiReading(data.reading || "Okuma alınamadı.");
    } catch { setAiReading("Bağlantı hatası."); }
    setIsLoadingAI(false);
  };

  const handleSave = () => {
    if (!selectedSpread) return;
    const entry = { id: generateId(), date: new Date().toISOString(), spreadType: selectedSpread.id, spreadName: selectedSpread.nameTR, question: question || undefined, cards: drawnCards.map(d => ({ card: d.card, position: d.position, isReversed: d.isReversed })), aiReading, personalNote, mood: 3 as 1|2|3|4|5, tags: drawnCards.map(d => d.card.suit || d.card.arcana), isDeep, conversation: chatMessages };
    addJournalEntry(entry); setSavedEntryId(entry.id);
  };

  const handleStartChat = () => {
    setChatMessages([{ role: "assistant", content: `Bu ${selectedSpread?.nameTR} okuması hakkında sormak istediğin bir şey var mı?`, timestamp: new Date().toISOString() }]);
    setPhase("chat");
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isLoadingChat) return;
    const p = getProfile();
    const userMsg: ChatMessage = { role: "user", content: chatInput, timestamp: new Date().toISOString() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated); setChatInput(""); setIsLoadingChat(true);
    try {
      const res = await fetch("/api/reading", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", conversation: updated.map(m => ({ role: m.role, content: m.content })), userContext: p ? buildUserContext(p) : "", isDeep }) });
      const data = await res.json();
      const aiMsg: ChatMessage = { role: "assistant", content: data.reading || "...", timestamp: new Date().toISOString() };
      const final = [...updated, aiMsg];
      setChatMessages(final);
      if (savedEntryId) updateJournalEntry(savedEntryId, { conversation: final });
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Bağlantı kesildi.", timestamp: new Date().toISOString() }]); }
    setIsLoadingChat(false);
  };

  const handleReset = () => { setPhase("select"); setSelectedSpread(null); setIsDeep(false); setQuestion(""); setDrawnCards([]); setAiReading(""); setPersonalNote(""); setSavedEntryId(null); setChatMessages([]); setCurrentFlip(0); };

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <div className="relative z-10 max-w-md mx-auto px-6 pt-12">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {phase !== "select" && (
              <button onClick={handleReset} className="text-xs uppercase tracking-widest mb-2 block"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)", background: "none", border: "none", cursor: "pointer" }}>
                ← Geri
              </button>
            )}
            <h1 className="font-display text-3xl" style={{ color: "var(--text-primary)" }}>
              {phase === "select" ? "Okuma Seç" : phase === "chat" ? "Lyra" : selectedSpread?.nameTR || "Okuma"}
            </h1>
          </div>
          {tokenInfo && phase === "select" && (
            <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {tokenInfo.freeLeft > 0 ? `${tokenInfo.freeLeft} deneme` : `${tokenInfo.tokens} jeton`}
            </span>
          )}
        </div>

        <div className="aether-line" />

        {/* SPREAD SEÇ */}
        {phase === "select" && (
          <div className="animate-fadeInUp">
            {SPREADS.map(spread => (
              <div key={spread.id}>
                <button className="aether-spread-row" onClick={() => handleSelectSpread(spread, false)}>
                  <Image src={spread.icon} alt={spread.nameTR} width={22} height={22} style={{ objectFit: "contain", opacity: 0.7, flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-display-bold text-base" style={{ color: "var(--text-primary)" }}>{spread.nameTR}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{spread.cardCount} kart</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{spread.description}</p>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>→</span>
                </button>
                {spread.cardCount >= 3 && (
                  <button onClick={() => handleSelectSpread(spread, true)}
                    className="w-full text-left px-1 py-2 text-xs"
                    style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                    <span>↳ Derin Fal — {spread.nameTR}</span>
                    <span style={{ color: "var(--text-muted)" }}>2 jeton</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* NİYET */}
        {phase === "intention" && selectedSpread && (
          <div className="animate-fadeInUp">
            {isDeep && <p className="text-xs mb-6 uppercase tracking-widest" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>Derin Fal — Lyra sohbet dahil</p>}
            <div className="aether-label">Pozisyonlar</div>
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedSpread.positions.map(pos => (
                <span key={pos} className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                  {pos}
                </span>
              )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} style={{ color: "var(--text-muted)" }}> · </span>, el], [] as React.ReactNode[])}
            </div>
            <div className="aether-label">Soru veya niyet</div>
            <textarea className="input-aether mb-10" placeholder="Ne bilmek istiyorsun?" rows={2} value={question} onChange={e => setQuestion(e.target.value)} />
            <button className="btn-aether-solid" onClick={handleStartDrawing}>Kartları Çek</button>
          </div>
        )}

        {/* ÇEKİM */}
        {phase === "drawing" && (
          <div className="animate-fadeInUp">
            <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {currentFlip < drawnCards.length ? <><span style={{ color: "var(--gold)" }}>{drawnCards[currentFlip].position}</span> kartını aç</> : "Yorum hazırlanıyor..."}
            </p>
            {drawnCards.length <= 3 ? (
              <div className={`flex justify-center gap-4`}>
                {drawnCards.map((d, i) => <TarotCardDisplay key={i} card={d.card} isRevealed={d.isFlipped} isReversed={d.isReversed} size={drawnCards.length === 1 ? "xl" : "md"} position={d.position} onClick={() => handleFlipCard(i)} animDelay={i * 120} />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 justify-items-center">
                {drawnCards.map((d, i) => <TarotCardDisplay key={i} card={d.card} isRevealed={d.isFlipped} isReversed={d.isReversed} size="sm" position={d.position} onClick={() => handleFlipCard(i)} animDelay={i * 80} />)}
              </div>
            )}
          </div>
        )}

        {/* OKUMA */}
        {phase === "reading" && (
          <div className="animate-fadeInUp">
            <div className={`flex gap-2 mb-6 overflow-x-auto pb-1 ${drawnCards.length <= 3 ? "justify-center" : ""}`}>
              {drawnCards.map((d, i) => <div key={i} className="flex-shrink-0"><TarotCardDisplay card={d.card} isRevealed isReversed={d.isReversed} size="sm" position={d.position} /></div>)}
            </div>

            <div className="aether-label">
              <Image src="/icons/icon-lyra.png" alt="Lyra" width={12} height={12} style={{ objectFit: "contain" }} />
              Lyra {isDeep ? "· Derin Okuma" : ""}
            </div>

            {isLoadingAI ? (
              <div className="py-8">
                <div className="space-y-3">
                  {[100, 85, 95, 70, 90].map((w, i) => <div key={i} className="shimmer h-4 rounded" style={{ width: `${w}%` }} />)}
                </div>
                <p className="text-xs text-center mt-4 uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>Lyra okuyor...</p>
              </div>
            ) : (
              <p className="aether-reading" dangerouslySetInnerHTML={{ __html: aiReading.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--gold)">$1</strong>') }} />
            )}

            <div className="aether-line" />
            <div className="aether-label">Kartlar</div>
            {drawnCards.map((d, i) => (
              <div key={i} className="aether-row">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: d.card.color }} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display-bold text-sm" style={{ color: d.card.color }}>{d.card.nameTR}</span>
                    {d.isReversed && <span className="text-xs" style={{ color: "var(--rose)", fontFamily: "var(--font-inter)" }}>ters</span>}
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>— {d.position}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    {d.isReversed ? d.card.reversed.meaningTR : d.card.upright.meaningTR}
                  </p>
                </div>
              </div>
            ))}

            <div className="aether-line" />
            {!savedEntryId ? (
              <>
                <textarea className="input-aether mb-6" placeholder="Kişisel notun..." rows={2} value={personalNote} onChange={e => setPersonalNote(e.target.value)} />
                <button className="btn-aether mb-3" onClick={handleSave}>Kaydet</button>
              </>
            ) : (
              <p className="text-xs text-center uppercase tracking-widest mb-4" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>✦ Kaydedildi</p>
            )}

            {isDeep && <button className="btn-aether-ghost mb-2" onClick={handleStartChat}>Lyra ile devam et →</button>}
            <button className="btn-aether-ghost" onClick={handleReset}>Yeni Okuma</button>
          </div>
        )}

        {/* CHAT */}
        {phase === "chat" && (
          <div className="animate-fadeInUp flex flex-col" style={{ minHeight: "58vh" }}>
            <div className="flex-1 space-y-5 mb-4 overflow-y-auto" style={{ maxHeight: "52vh" }}>
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Image src="/icons/icon-lyra.png" alt="Lyra" width={14} height={14} style={{ objectFit: "contain" }} />
                      <span className="text-xs uppercase tracking-widest" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>Lyra</span>
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "text-right" : ""}`}
                    style={{ color: msg.role === "user" ? "var(--text-muted)" : "var(--text-secondary)", fontFamily: "var(--font-inter)", paddingLeft: msg.role === "assistant" ? "22px" : 0 }}>
                    {msg.content}
                  </p>
                  {i < chatMessages.length - 1 && <div className="aether-line" style={{ margin: "16px 0" }} />}
                </div>
              ))}
              {isLoadingChat && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Image src="/icons/icon-lyra.png" alt="Lyra" width={14} height={14} style={{ objectFit: "contain" }} />
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>Lyra</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)", paddingLeft: "22px" }}>...</p>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="aether-line" style={{ margin: "0 0 12px" }} />
            <div className="flex gap-3 items-end">
              <input type="text" className="input-aether flex-1" placeholder="Lyra'ya sor..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} />
              <button onClick={handleSendChat} disabled={!chatInput.trim() || isLoadingChat} style={{ color: chatInput.trim() ? "var(--gold)" : "var(--text-muted)", fontFamily: "var(--font-inter)", background: "none", border: "none", cursor: "pointer", fontSize: "13px", paddingBottom: "10px" }}>gönder</button>
            </div>
            <button className="btn-aether-ghost mt-4" onClick={() => setPhase("reading")}>← Okumaya dön</button>
          </div>
        )}

        {/* PAYWALL */}
        {phase === "paywall" && (
          <div className="animate-fadeInUp py-8">
            <div className="aether-label">Pollux Astro</div>
            <h2 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>Ücretsiz denemen doldu</h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Satın alarak 20 jeton kazan ve tüm özelliklere eriş.
            </p>
            <div className="aether-line" />
            {["20 AI okuma jetonu", "Tüm spreadler", "Lyra sohbet", "Haftalık özet", "Sınırsız journal"].map(f => (
              <div key={f} className="aether-row" style={{ padding: "12px 0" }}>
                <span style={{ color: "var(--gold)", fontSize: "10px" }}>✦</span>
                <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{f}</span>
              </div>
            ))}
            <div className="aether-line" />
            <button className="btn-aether-solid mb-3">Satın Al — ₺199</button>
            <button className="btn-aether-ghost" onClick={handleReset}>Geri Dön</button>
          </div>
        )}
      </div>
      <Navigation />
    </main>
  );
}
