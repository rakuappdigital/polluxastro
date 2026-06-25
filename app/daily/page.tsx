"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDailyCard, getMoonPhase, TarotCard } from "@/lib/tarot-data";
import {
  getProfile, saveProfile, addJournalEntry, updateJournalEntry,
  getJournal, generateId, updateStreak, isMorningDone, setMorningDone,
  buildUserContext, canDoReading, consumeToken, ChatMessage,
} from "@/lib/store";
import AmbientOrbs from "@/components/ui/AmbientOrbs";
import StarField from "@/components/ui/StarField";
import Navigation from "@/components/layout/Navigation";
import TarotCardDisplay from "@/components/cards/TarotCardDisplay";
import Image from "next/image";

const ELEMENTS = [
  { id: "fire", label: "Ateş", icon: "/icons/element-fire.png", desc: "Enerjik, tutkulu, harekete hazır" },
  { id: "water", label: "Su", icon: "/icons/element-water.png", desc: "Duygusal, sezgisel, içe dönük" },
  { id: "air", label: "Hava", icon: "/icons/element-air.png", desc: "Zihinsel, analitik, meraklı" },
  { id: "earth", label: "Toprak", icon: "/icons/element-earth.png", desc: "Sakin, odaklı, kararlı" },
];

const MOODS = [
  { value: 1, emoji: "😔" },
  { value: 2, emoji: "😟" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "✨" },
];

type Phase =
  | "morning-ritual"   // Sabah: element seç + niyet yaz
  | "intention-mantra" // Mantra göster
  | "reveal"           // Kartı aç
  | "reading"          // Tam okuma
  | "chat"             // AI sohbet
  | "evening";         // Akşam yansıması

export default function DailyPage() {
  const [profile, setProfileState] = useState(getProfile());
  const [card, setCard] = useState<TarotCard | null>(null);
  const [moonPhase] = useState(getMoonPhase());
  const [phase, setPhase] = useState<Phase>("morning-ritual");

  // Morning ritual state
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [intention, setIntention] = useState("");
  const [mantra, setMantra] = useState("");
  const [isLoadingMantra, setIsLoadingMantra] = useState(false);

  // Card & reading state
  const [isRevealed, setIsRevealed] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Evening state
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
      if (updated.streak !== p.streak) { saveProfile(updated); }
      setProfileState(updated);
      setStreak(updated.streak);
    }

    // Daha önce yapılan günlük okumayı kontrol et
    const journal = getJournal();
    const today = new Date().toDateString();
    const existing = journal.find(
      e => new Date(e.date).toDateString() === today && e.spreadType === "daily"
    );

    if (existing) {
      setSavedEntryId(existing.id);
      if (existing.conversation?.length) {
        setChatMessages(existing.conversation);
      }
      if (isEveningTime && !existing.eveningReflection) {
        setPhase("evening");
      } else {
        setPhase("reading");
        setIsRevealed(true);
      }
    } else if (isMorningDone()) {
      // Sabah ritüeli yapıldı ama kayıt yok — karta git
      setPhase("reveal");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sabah ritüeli: mantra al ─────────────────────────────────────────────
  const handleGetMantra = async () => {
    if (!intention.trim() || !card) return;
    setIsLoadingMantra(true);

    // Niyeti profile'a kaydet
    const p = getProfile();
    if (p) {
      const updated = { ...p, lastIntention: intention, lastIntentionDate: new Date().toDateString() };
      saveProfile(updated);
      setProfileState(updated);
    }

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "intention",
          intention,
          cardName: card.nameTR,
          moonPhase: moonPhase.name,
          userContext: buildUserContext(getProfile()!),
        }),
      });
      const data = await res.json();
      setMantra(data.reading || `Ben "${intention}" niyetiyle bu güne başlıyorum.`);
    } catch {
      setMantra(`Ben "${intention}" niyetiyle bu güne başlıyorum.`);
    }

    setIsLoadingMantra(false);
    setPhase("intention-mantra");
  };

  // ── Kart aç ─────────────────────────────────────────────────────────────
  const handleReveal = () => {
    setIsRevealed(true);
    setMorningDone();
    setTimeout(() => setPhase("reading"), 900);
  };

  // ── Kaydet ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!card || !mood) return;
    const entry = {
      id: generateId(),
      date: new Date().toISOString(),
      spreadType: "daily",
      spreadName: "Günlük Kart",
      question: intention || undefined,
      cards: [{ card, position: "Günlük Mesaj", isReversed: false }],
      aiReading: card.upright.meaningTR,
      personalNote: note,
      mood: mood as 1 | 2 | 3 | 4 | 5,
      tags: [card.arcana === "major" ? "büyük-arkana" : card.suit || ""],
      conversation: chatMessages,
    };
    addJournalEntry(entry);
    setSavedEntryId(entry.id);
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  const handleStartChat = () => {
    if (!card) return;
    // İlk AI mesajını oluştur (önceden gelen okumayı chat'e bağla)
    const initial: ChatMessage = {
      role: "assistant",
      content: `${card.nameTR} kartı bugün seninle. ${card.upright.meaningTR}\n\nBu okuma hakkında sormak istediğin bir şey var mı?`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages([initial]);
    setPhase("chat");
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isLoadingChat) return;
    const p = getProfile();

    const newMsg: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...chatMessages, newMsg];
    setChatMessages(updatedMsgs);
    setChatInput("");
    setIsLoadingChat(true);

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          conversation: updatedMsgs.map(m => ({ role: m.role, content: m.content })),
          userContext: p ? buildUserContext(p) : "",
          isDeep: false,
        }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.reading || "...",
        timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setChatMessages(finalMsgs);

      // Journal'a kaydet
      if (savedEntryId) {
        updateJournalEntry(savedEntryId, { conversation: finalMsgs });
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Bağlantı kesildi. Lütfen tekrar dene.",
        timestamp: new Date().toISOString(),
      }]);
    }
    setIsLoadingChat(false);
  };

  // ── Akşam yansıması ──────────────────────────────────────────────────────
  const handleEveningSave = () => {
    if (savedEntryId) {
      updateJournalEntry(savedEntryId, { eveningReflection: eveningNote });
    }
    setPhase("reading");
  };

  if (!card) return null;

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <AmbientOrbs />
      <StarField count={40} />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {greeting}, {profile?.name || "yolcu"}
            </p>
            <h1 className="font-display text-2xl" style={{ color: "var(--text-primary)" }}>
              {phase === "morning-ritual" || phase === "intention-mantra"
                ? "Sabah Ritüeli"
                : phase === "chat"
                ? "Lyra ile Konuş"
                : "Günlük Kart"}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xl">{moonPhase.emoji}</div>
            <div className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {moonPhase.name}
            </div>
          </div>
        </div>

        {/* Streak */}
        {streak > 1 && phase !== "chat" && (
          <div className="glass-gold rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-5">
            <span className="text-base">🔥</span>
            <span className="font-display-bold text-sm" style={{ color: "var(--gold)" }}>
              {streak} günlük seri
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              — Tutarlılığın güç.
            </span>
          </div>
        )}

        {/* ─── SABAH RİTÜELİ ─────────────────────────────────────── */}
        {phase === "morning-ritual" && (
          <div className="animate-fadeInUp">
            {/* Moon energy */}
            <div className="glass rounded-2xl p-4 mb-6 flex gap-3">
              <span className="text-xl mt-0.5">{moonPhase.emoji}</span>
              <div>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                  {moonPhase.name} Enerjisi
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  {moonPhase.energy}
                </p>
              </div>
            </div>

            {/* Element seç */}
            <div className="mb-6">
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                Şu an hangi element daha yakın hissettiriyor?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ELEMENTS.map(el => (
                  <button
                    key={el.id}
                    onClick={() => setSelectedElement(el.id)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: selectedElement === el.id ? "rgba(212,175,95,0.12)" : "var(--bg-glass)",
                      border: `1px solid ${selectedElement === el.id ? "rgba(212,175,95,0.4)" : "var(--border-glass)"}`,
                    }}
                  >
                    <div className="mb-1">
                      <Image src={el.icon} alt={el.label} width={32} height={32} style={{ objectFit: "contain" }} />
                    </div>
                    <div className="font-display-bold text-sm" style={{ color: selectedElement === el.id ? "var(--gold)" : "var(--text-primary)" }}>
                      {el.label}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      {el.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Niyet */}
            <div className="mb-6">
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                Bugün için bir niyet belirle
              </p>
              <textarea
                className="input-mystic w-full text-sm resize-none"
                placeholder="Örn: Kendime karşı sabırlı olacağım. Bir karar alacağım. Bugün dinleyeceğim..."
                rows={3}
                value={intention}
                onChange={e => setIntention(e.target.value)}
              />
            </div>

            <button
              className="btn-gold w-full"
              onClick={handleGetMantra}
              disabled={!intention.trim() || isLoadingMantra}
              style={{ opacity: intention.trim() ? 1 : 0.4 }}
            >
              {isLoadingMantra ? "Mantra hazırlanıyor..." : "Mantramu Al & Kartı Aç ✦"}
            </button>

            <button
              className="w-full mt-3 py-2 text-sm"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
              onClick={() => { setMorningDone(); setPhase("reveal"); }}
            >
              Ritüeli atla, doğrudan karta geç
            </button>
          </div>
        )}

        {/* ─── MANTRA ────────────────────────────────────────────── */}
        {phase === "intention-mantra" && (
          <div className="animate-fadeInUp text-center">
            <div className="text-4xl mb-6 animate-pulse-glow">{moonPhase.emoji}</div>

            <div
              className="rounded-2xl p-6 mb-8 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(107,91,166,0.15), rgba(212,175,95,0.08))",
                border: "1px solid rgba(212,175,95,0.25)",
              }}
            >
              <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ✦ Bugünün Mantrası
              </div>
              <p className="font-display text-xl leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {mantra}
              </p>
            </div>

            <p className="text-sm mb-8" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              Bu niyetle kartını aç.
            </p>

            <button className="btn-primary w-full" onClick={() => setPhase("reveal")}>
              Kartımı Açmaya Hazırım
            </button>
          </div>
        )}

        {/* ─── KART AÇILIŞ ───────────────────────────────────────── */}
        {phase === "reveal" && (
          <div className="animate-fadeInUp text-center">
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {intention
                ? `"${intention}" niyetini taşıyarak kartını aç.`
                : "Bir nefes al. Kartına odaklan."}
            </p>

            <div className="flex justify-center mb-10">
              <div onClick={handleReveal} className="cursor-pointer">
                <TarotCardDisplay
                  card={card}
                  isRevealed={isRevealed}
                  size="xl"
                  showBack={true}
                />
              </div>
            </div>

            {!isRevealed && (
              <button className="btn-primary px-10" onClick={handleReveal}>
                Kartımı Aç ✦
              </button>
            )}
          </div>
        )}

        {/* ─── OKUMA ─────────────────────────────────────────────── */}
        {phase === "reading" && (
          <div className="animate-fadeInUp">
            <div className="flex justify-center mb-5">
              <TarotCardDisplay card={card} isRevealed size="lg" />
            </div>

            <div className="text-center mb-5">
              <h2 className="font-display text-3xl gradient-gold mb-1">{card.nameTR}</h2>
              <div className="flex flex-wrap justify-center gap-1.5">
                {card.keywordsTR.map(kw => (
                  <span key={kw} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${card.color}15`, border: `1px solid ${card.color}30`, color: card.color, fontFamily: "var(--font-inter)" }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Ana mesaj */}
            <div className="glass-gold rounded-2xl p-5 mb-4">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ✦ Günün Mesajı
              </div>
              <p className="font-display text-lg leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {card.upright.meaningTR}
              </p>
            </div>

            {/* Niyet bağlantısı */}
            {intention && (
              <div className="glass rounded-2xl p-4 mb-4"
                style={{ borderColor: `${card.color}30` }}>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: card.color, fontFamily: "var(--font-inter)" }}>
                  ◎ Niyetinle Bağlantı
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                  "{intention}" niyetin ve {card.nameTR} — bu ikisi bugün sana ortak bir şey söylüyor.
                </p>
              </div>
            )}

            {/* Odak alanları */}
            {profile?.focus?.includes("love") && (
              <div className="glass rounded-2xl p-4 mb-3">
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--rose)", fontFamily: "var(--font-inter)" }}>♡ Aşk</div>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{card.upright.love}</p>
              </div>
            )}
            {profile?.focus?.includes("career") && (
              <div className="glass rounded-2xl p-4 mb-3">
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>◎ Kariyer</div>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{card.upright.career}</p>
              </div>
            )}
            {profile?.focus?.includes("spiritual") && (
              <div className="glass rounded-2xl p-4 mb-4">
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--indigo-light)", fontFamily: "var(--font-inter)" }}>✦ Ruhsal</div>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>{card.upright.spiritual}</p>
              </div>
            )}

            {/* Sembolizm */}
            <div className="glass rounded-2xl p-4 mb-5">
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>◗ Sembolizm</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>{card.symbolism}</p>
            </div>

            {/* Ruh hali + not kaydet */}
            {!savedEntryId ? (
              <div className="mb-5">
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>Şu an nasılsın?</p>
                <div className="flex gap-2 mb-4">
                  {MOODS.map(m => (
                    <button key={m.value} onClick={() => setMood(m.value)}
                      className="flex-1 flex flex-col items-center py-3 rounded-xl transition-all"
                      style={{
                        background: mood === m.value ? "rgba(212,175,95,0.15)" : "var(--bg-glass)",
                        border: `1px solid ${mood === m.value ? "rgba(212,175,95,0.4)" : "var(--border-glass)"}`,
                      }}>
                      <span className="text-2xl">{m.emoji}</span>
                    </button>
                  ))}
                </div>
                <textarea className="input-mystic w-full text-sm resize-none mb-4"
                  placeholder="Bu kart sende ne uyandırdı? (isteğe bağlı)"
                  rows={2} value={note} onChange={e => setNote(e.target.value)} />
                <button className="btn-primary w-full" onClick={handleSave}
                  disabled={!mood} style={{ opacity: mood ? 1 : 0.4 }}>
                  Günlüğe Kaydet
                </button>
              </div>
            ) : (
              <div className="mb-5 glass rounded-2xl p-4 flex items-center gap-3">
                <span style={{ color: "var(--gold)" }}>✓</span>
                <div>
                  <p className="text-sm font-display-bold" style={{ color: "var(--gold)" }}>Kaydedildi</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                    {isEveningTime ? "Akşam yansımasını da ekle." : "Akşam geri gel."}
                  </p>
                </div>
              </div>
            )}

            {/* Lyra ile sohbet CTA */}
            <div className="rounded-2xl p-5 mb-4 text-center"
              style={{ background: "linear-gradient(135deg, rgba(107,91,166,0.15), rgba(45,27,94,0.2))", border: "1px solid rgba(107,91,166,0.3)" }}>
              <div className="text-xl mb-2">◗</div>
              <p className="font-display text-base mb-1" style={{ color: "var(--text-primary)" }}>
                Lyra ile devam et
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Bu kart hakkında soru sor, daha derine in
              </p>
              <button className="btn-ghost text-sm px-6 py-2" onClick={handleStartChat}>
                Sohbet Başlat →
              </button>
            </div>

            {/* Derin okuma */}
            <div className="text-center mb-2">
              <Link href="/okuma" className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                Spread ile daha derin git →
              </Link>
            </div>
          </div>
        )}

        {/* ─── LYRA SOHBET ────────────────────────────────────────── */}
        {phase === "chat" && (
          <div className="animate-fadeInUp flex flex-col" style={{ minHeight: "60vh" }}>
            {/* Mesajlar */}
            <div className="flex-1 space-y-4 mb-4 overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1"
                      style={{ background: "rgba(212,175,95,0.2)", fontSize: "10px", color: "var(--gold)" }}>
                      ✦
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-4 py-3 max-w-[85%]"
                    style={{
                      background: msg.role === "user"
                        ? "rgba(107,91,166,0.25)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${msg.role === "user" ? "rgba(107,91,166,0.4)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-inter)" }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                    style={{ background: "rgba(212,175,95,0.2)", fontSize: "10px", color: "var(--gold)" }}>
                    ✦
                  </div>
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
                          style={{ background: "var(--gold)", animationDelay: `${i * 200}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 sticky bottom-24">
              <input
                type="text"
                className="input-mystic flex-1 text-sm"
                placeholder="Lyra'ya sor..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChat()}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || isLoadingChat}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: chatInput.trim() ? "var(--gold)" : "var(--bg-glass)",
                  color: chatInput.trim() ? "#1A0A2E" : "var(--text-muted)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                →
              </button>
            </div>

            <button className="text-xs text-center mt-3 w-full"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
              onClick={() => setPhase("reading")}>
              ← Okumaya dön
            </button>
          </div>
        )}

        {/* ─── AKŞAM YANSIMASI ─────────────────────────────────────── */}
        {phase === "evening" && (
          <div className="animate-fadeInUp">
            <div className="glass-gold rounded-2xl p-5 mb-5">
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-inter)" }}>
                ☽ Akşam Yansıması
              </div>
              <p className="font-display text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                Bugün {card.nameTR} sende nasıl belirdi?
              </p>
              {intention && (
                <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                  "{intention}" niyetin gerçekleşti mi?
                </p>
              )}
            </div>

            <textarea className="input-mystic w-full text-sm resize-none mb-5"
              placeholder="Bugün bu enerjiyi nerede hissettin?"
              rows={5} value={eveningNote} onChange={e => setEveningNote(e.target.value)} />

            <button className="btn-gold w-full" onClick={handleEveningSave}>
              Günü Kapat ☽
            </button>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
