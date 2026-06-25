"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDailyCard, getMoonPhase, TarotCard } from "@/lib/tarot-data";
import {
  getProfile, saveProfile, addJournalEntry, updateJournalEntry,
  getJournal, generateId, updateStreak, isMorningDone, setMorningDone,
  buildUserContext, consumeToken, ChatMessage,
} from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import Navigation from "@/components/layout/Navigation";
import TarotCardDisplay from "@/components/cards/TarotCardDisplay";
import Image from "next/image";

const ELEMENTS = [
  { id: "fire",  label: "Ateş",   icon: "/icons/element-fire.png",  desc: "Enerjik, tutkulu" },
  { id: "water", label: "Su",     icon: "/icons/element-water.png", desc: "Duygusal, sezgisel" },
  { id: "air",   label: "Hava",   icon: "/icons/element-air.png",   desc: "Zihinsel, meraklı" },
  { id: "earth", label: "Toprak", icon: "/icons/element-earth.png", desc: "Sakin, kararlı" },
];

const MOODS = [
  { value: 1, icon: "/icons/mod1.png" },
  { value: 2, icon: "/icons/mod2.png" },
  { value: 3, icon: "/icons/mod3.png" },
  { value: 4, icon: "/icons/mod4.png" },
  { value: 5, icon: "/icons/mod5.png" },
];

type Phase = "morning-ritual" | "intention-mantra" | "reveal" | "reading" | "chat" | "evening";

export default function DailyPage() {
  const [profile, setProfileState] = useState(getProfile());
  const [card, setCard] = useState<TarotCard | null>(null);
  const [moonPhase] = useState(getMoonPhase());
  const [phase, setPhase] = useState<Phase>("morning-ritual");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [intention, setIntention] = useState("");
  const [mantra, setMantra] = useState("");
  const [isLoadingMantra, setIsLoadingMantra] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [eveningNote, setEveningNote] = useState("");

  const hour = new Date().getHours();
  const isEveningTime = hour >= 18;
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  useEffect(() => {
    const dailyCard = getDailyCard();
    setCard(dailyCard);
    const p = getProfile();
    if (p) {
      const updated = updateStreak(p);
      if (updated.streak !== p.streak) saveProfile(updated);
      setProfileState(updated);
      setStreak(updated.streak);
    }
    const journal = getJournal();
    const today = new Date().toDateString();
    const existing = journal.find(e => new Date(e.date).toDateString() === today && e.spreadType === "daily");
    if (existing) {
      setSavedEntryId(existing.id);
      if (existing.conversation?.length) setChatMessages(existing.conversation);
      setPhase(isEveningTime && !existing.eveningReflection ? "evening" : "reading");
      setIsRevealed(true);
    } else if (isMorningDone()) {
      setPhase("reveal");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetMantra = async () => {
    if (!intention.trim() || !card) return;
    setIsLoadingMantra(true);
    const p = getProfile();
    if (p) { const u = { ...p, lastIntention: intention, lastIntentionDate: new Date().toDateString() }; saveProfile(u); setProfileState(u); }
    try {
      const res = await fetch("/api/reading", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "intention", intention, cardName: card.nameTR, moonPhase: moonPhase.name, userContext: buildUserContext(getProfile()!) }),
      });
      const data = await res.json();
      setMantra(data.reading || `Ben "${intention}" niyetiyle bu güne başlıyorum.`);
    } catch { setMantra(`Ben "${intention}" niyetiyle bu güne başlıyorum.`); }
    setIsLoadingMantra(false);
    setPhase("intention-mantra");
  };

  const handleReveal = () => { setIsRevealed(true); setMorningDone(); setTimeout(() => setPhase("reading"), 900); };

  const handleSave = () => {
    if (!card || !mood) return;
    const entry = { id: generateId(), date: new Date().toISOString(), spreadType: "daily", spreadName: "Günlük Kart", question: intention || undefined, cards: [{ card, position: "Günlük Mesaj", isReversed: false }], aiReading: card.upright.meaningTR, personalNote: note, mood: mood as 1|2|3|4|5, tags: [card.arcana === "major" ? "büyük-arkana" : card.suit || ""], conversation: chatMessages };
    addJournalEntry(entry);
    setSavedEntryId(entry.id);
  };

  const handleStartChat = () => {
    if (!card) return;
    setChatMessages([{ role: "assistant", content: `${card.nameTR} kartı bugün seninle. ${card.upright.meaningTR}\n\nBu okuma hakkında sormak istediğin bir şey var mı?`, timestamp: new Date().toISOString() }]);
    setPhase("chat");
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isLoadingChat) return;
    const p = getProfile();
    const newMsg: ChatMessage = { role: "user", content: chatInput, timestamp: new Date().toISOString() };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated); setChatInput(""); setIsLoadingChat(true);
    try {
      const res = await fetch("/api/reading", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", conversation: updated.map(m => ({ role: m.role, content: m.content })), userContext: p ? buildUserContext(p) : "", isDeep: false }) });
      const data = await res.json();
      const aiMsg: ChatMessage = { role: "assistant", content: data.reading || "...", timestamp: new Date().toISOString() };
      const final = [...updated, aiMsg];
      setChatMessages(final);
      if (savedEntryId) updateJournalEntry(savedEntryId, { conversation: final });
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Bağlantı kesildi.", timestamp: new Date().toISOString() }]); }
    setIsLoadingChat(false);
  };

  const handleEveningSave = () => { if (savedEntryId) updateJournalEntry(savedEntryId, { eveningReflection: eveningNote }); setPhase("reading"); };

  if (!card) return null;

  return (
    <main className="relative min-h-screen overflow-hidden pb-28" style={{ background: "var(--bg-primary)" }}>
      <AmbientOrbs />

      <div className="relative z-10 max-w-md mx-auto px-6 pt-12">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {greeting}{profile?.name ? `, ${profile.name}` : ""}
              {streak > 1 && (
                <span className="ml-3 inline-flex items-center gap-1">
                  <Image src="/icons/icon-streak.png" alt="streak" width={11} height={11} />
                  <span style={{ color: "var(--gold)" }}>{streak}</span>
                </span>
              )}
            </p>
            <h1 className="font-display text-3xl" style={{ color: "var(--text-primary)", letterSpacing: "0.03em" }}>
              {phase === "morning-ritual" || phase === "intention-mantra" ? "Sabah Ritüeli"
               : phase === "chat" ? "Lyra"
               : "Günlük Kart"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Image src={moonPhase.icon} alt={moonPhase.name} width={26} height={26} style={{ objectFit: "contain" }} />
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{moonPhase.name}</span>
          </div>
        </div>

        <div className="aether-line" />

        {/* ── SABAH RİTÜELİ ── */}
        {phase === "morning-ritual" && (
          <div className="animate-fadeInUp">
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
              {moonPhase.energy}
            </p>

            <div className="aether-label">Element</div>
            <div className="aether-options mb-6">
              {ELEMENTS.map(el => (
                <button key={el.id} onClick={() => setSelectedElement(el.id)}
                  className={`aether-option ${selectedElement === el.id ? "active" : ""}`}>
                  <Image src={el.icon} alt={el.label} width={28} height={28} style={{ objectFit: "contain", opacity: selectedElement === el.id ? 1 : 0.45 }} />
                  <span className="aether-option-label">{el.label}</span>
                </button>
              ))}
            </div>

            <div className="aether-label">Niyet</div>
            <textarea className="input-aether mb-8" placeholder="Bugün için bir niyet..." rows={2} value={intention} onChange={e => setIntention(e.target.value)} />

            <button className="btn-aether-solid mb-3" onClick={handleGetMantra} disabled={!intention.trim() || isLoadingMantra}>
              {isLoadingMantra ? "Hazırlanıyor..." : "Mantramu Al ✦"}
            </button>
            <button className="btn-aether-ghost" onClick={() => { setMorningDone(); setPhase("reveal"); }}>
              Atla, kartıma geç
            </button>
          </div>
        )}

        {/* ── MANTRA ── */}
        {phase === "intention-mantra" && (
          <div className="animate-fadeInUp">
            <div className="flex justify-center mb-8">
              <Image src={moonPhase.icon} alt={moonPhase.name} width={56} height={56} style={{ objectFit: "contain" }} />
            </div>
            <div className="aether-label">Bugünün Mantrası</div>
            <p className="aether-reading mb-10">{mantra}</p>
            <button className="btn-aether-solid" onClick={() => setPhase("reveal")}>Kartımı Aç</button>
          </div>
        )}

        {/* ── KART AÇILIŞ ── */}
        {phase === "reveal" && (
          <div className="animate-fadeInUp text-center">
            {intention && (
              <p className="text-sm mb-6 italic" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                "{intention}"
              </p>
            )}
            <div className="flex justify-center mb-10" onClick={handleReveal} style={{ cursor: "pointer" }}>
              <TarotCardDisplay card={card} isRevealed={isRevealed} size="xl" showBack />
            </div>
            {!isRevealed && (
              <button className="btn-aether" onClick={handleReveal}>Kartımı Aç</button>
            )}
          </div>
        )}

        {/* ── OKUMA ── */}
        {phase === "reading" && (
          <div className="animate-fadeInUp">
            <div className="flex justify-center mb-6">
              <TarotCardDisplay card={card} isRevealed size="lg" />
            </div>

            <div className="text-center mb-2">
              <h2 className="font-display text-3xl gradient-gold">{card.nameTR}</h2>
              {(card.element || card.planet) && (
                <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                  {[card.element, card.planet, card.zodiac].filter(Boolean).join("  ·  ")}
                </p>
              )}
            </div>

            <div className="aether-line" />

            <div className="aether-label">Günün Mesajı</div>
            <p className="aether-reading">{card.upright.meaningTR}</p>

            {intention && (
              <>
                <div className="aether-line" />
                <div className="aether-label">Niyetinle</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  "{intention}" — {card.nameTR} enerjisi bu niyetle rezonans kuruyor.
                </p>
              </>
            )}

            {profile?.focus?.includes("love") && (
              <>
                <div className="aether-line" />
                <div className="aether-label">Aşk & İlişki</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{card.upright.love}</p>
              </>
            )}
            {profile?.focus?.includes("career") && (
              <>
                <div className="aether-line" />
                <div className="aether-label">Kariyer</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{card.upright.career}</p>
              </>
            )}
            {profile?.focus?.includes("spiritual") && (
              <>
                <div className="aether-line" />
                <div className="aether-label">Ruhsal</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{card.upright.spiritual}</p>
              </>
            )}

            <div className="aether-line" />
            <div className="aether-label">Sembolizm</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{card.symbolism}</p>

            {!savedEntryId ? (
              <>
                <div className="aether-line" />
                <div className="aether-label">Şu an nasılsın?</div>
                <div className="aether-moods mb-6">
                  {MOODS.map(m => (
                    <button key={m.value} onClick={() => setMood(m.value)} className={`aether-mood ${mood === m.value ? "active" : ""}`}>
                      <Image src={m.icon} alt={`${m.value}`} width={28} height={28} style={{ objectFit: "contain", opacity: mood === m.value ? 1 : 0.4 }} />
                    </button>
                  ))}
                </div>
                <textarea className="input-aether mb-6" placeholder="Kişisel notun..." rows={2} value={note} onChange={e => setNote(e.target.value)} />
                <button className="btn-aether mb-3" onClick={handleSave} disabled={!mood}>Günlüğe Kaydet</button>
              </>
            ) : (
              <>
                <div className="aether-line" />
                <p className="text-xs text-center uppercase tracking-widest mb-4" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                  ✦ Kaydedildi
                </p>
              </>
            )}

            <div className="aether-line" />
            <button className="btn-aether-ghost" onClick={handleStartChat}>Lyra ile devam et →</button>
            <div style={{ height: "8px" }} />
            <Link href="/okuma" className="btn-aether-ghost" style={{ display: "block", textAlign: "center" }}>
              Spread ile derin okuma →
            </Link>
          </div>
        )}

        {/* ── LYRA SOHBET ── */}
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
            </div>

            <div className="aether-line" style={{ margin: "0 0 12px" }} />
            <div className="flex gap-3 items-end">
              <input type="text" className="input-aether flex-1" placeholder="Lyra'ya sor..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} />
              <button onClick={handleSendChat} disabled={!chatInput.trim() || isLoadingChat}
                className="text-sm pb-2" style={{ color: chatInput.trim() ? "var(--gold)" : "var(--text-muted)", fontFamily: "var(--font-inter)", background: "none", border: "none", cursor: "pointer" }}>
                gönder
              </button>
            </div>
            <button className="btn-aether-ghost mt-4" onClick={() => setPhase("reading")}>← Okumaya dön</button>
          </div>
        )}

        {/* ── AKŞAM ── */}
        {phase === "evening" && (
          <div className="animate-fadeInUp">
            <div className="aether-label">Akşam Yansıması</div>
            <p className="aether-reading mb-2">{card.nameTR} bugün sende nasıl belirdi?</p>
            {intention && <p className="text-sm mb-6 italic" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>"{intention}"</p>}
            <div className="aether-line" />
            <textarea className="input-aether mb-6" placeholder="Bugün bu enerjiyi nerede hissettin?" rows={4} value={eveningNote} onChange={e => setEveningNote(e.target.value)} />
            <button className="btn-aether-solid" onClick={handleEveningSave}>Günü Kapat</button>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
