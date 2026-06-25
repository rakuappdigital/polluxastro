"use client";

import { TarotCard } from "./tarot-data";

export interface UserProfile {
  id: string;
  name: string;
  birthDate: string;
  focus: string[];
  experience: "beginner" | "intermediate" | "advanced";
  primaryBirthCard?: TarotCard;
  secondaryBirthCard?: TarotCard;
  deckPreference: "classic" | "minimal" | "gothic";
  isPurchased: boolean;       // $19.99 satın aldı mı
  tokens: number;             // AI okuma jetonu
  freeTrialUsed: number;      // Ücretsiz 3 denemeden kaç kullandı
  createdAt: string;
  streak: number;
  lastCheckIn?: string;
  lastIntention?: string;     // Bugünkü niyet
  lastIntentionDate?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  spreadType: string;
  spreadName: string;
  question?: string;
  cards: Array<{ card: TarotCard; position: string; isReversed: boolean }>;
  aiReading: string;
  personalNote: string;
  mood: 1 | 2 | 3 | 4 | 5;
  eveningReflection?: string;
  tags: string[];
  isDeep?: boolean;           // Derin fal mı
  conversation?: ChatMessage[]; // Multi-turn sohbet
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface WeeklySummary {
  weekStart: string;
  cards: Array<{ card: TarotCard; count: number }>;
  dominantSuit: string;
  avgMood: number;
  aiSummary: string;
  generatedAt: string;
}

const STORAGE_KEYS = {
  PROFILE: "pollux_profile",
  JOURNAL: "pollux_journal",
  ONBOARDED: "pollux_onboarded",
  WEEKLY: "pollux_weekly",
  MORNING_DONE: "pollux_morning",
};

// ─── Profile ───────────────────────────────────────────────────────────────

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (!raw) return null;
  const p = JSON.parse(raw) as UserProfile;
  // Migration: eski kayıtlara token ekle
  if (typeof p.tokens !== "number") p.tokens = 0;
  if (typeof p.freeTrialUsed !== "number") p.freeTrialUsed = 0;
  if (typeof p.isPurchased !== "boolean") p.isPurchased = false;
  return p;
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEYS.ONBOARDED);
}

export function setOnboarded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ONBOARDED, "true");
}

// ─── Token Sistemi ─────────────────────────────────────────────────────────

export type ReadingType = "basic" | "deep";

export function canDoReading(profile: UserProfile, type: ReadingType = "basic"): {
  allowed: boolean;
  reason: "free_trial" | "tokens" | "no_tokens" | "purchase_required";
} {
  const cost = type === "deep" ? 2 : 1;

  // Ücretsiz deneme hakkı (satın alma olmadan)
  if (!profile.isPurchased && profile.freeTrialUsed < 3) {
    return { allowed: true, reason: "free_trial" };
  }

  // Satın almış ve yeterli token var
  if (profile.isPurchased && profile.tokens >= cost) {
    return { allowed: true, reason: "tokens" };
  }

  // Satın almış ama token yok
  if (profile.isPurchased && profile.tokens < cost) {
    return { allowed: false, reason: "no_tokens" };
  }

  // Satın almamış, deneme hakkı dolmuş
  return { allowed: false, reason: "purchase_required" };
}

export function consumeToken(profile: UserProfile, type: ReadingType = "basic"): UserProfile {
  const cost = type === "deep" ? 2 : 1;

  if (!profile.isPurchased && profile.freeTrialUsed < 3) {
    return { ...profile, freeTrialUsed: profile.freeTrialUsed + 1 };
  }

  return { ...profile, tokens: Math.max(0, profile.tokens - cost) };
}

export function activatePurchase(profile: UserProfile): UserProfile {
  return { ...profile, isPurchased: true, tokens: profile.tokens + 20 };
}

// ─── Journal ───────────────────────────────────────────────────────────────

export function getJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEYS.JOURNAL);
  return raw ? JSON.parse(raw) : [];
}

export function addJournalEntry(entry: JournalEntry): void {
  if (typeof window === "undefined") return;
  const existing = getJournal();
  localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify([entry, ...existing]));
}

export function updateJournalEntry(id: string, updates: Partial<JournalEntry>): void {
  if (typeof window === "undefined") return;
  const existing = getJournal();
  const updated = existing.map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
}

// ─── Morning / Streak ──────────────────────────────────────────────────────

export function isMorningDone(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEYS.MORNING_DONE);
  return raw === new Date().toDateString();
}

export function setMorningDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.MORNING_DONE, new Date().toDateString());
}

export function updateStreak(profile: UserProfile): UserProfile {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (profile.lastCheckIn === today) return profile;
  const newStreak = profile.lastCheckIn === yesterday ? (profile.streak || 0) + 1 : 1;
  return { ...profile, streak: newStreak, lastCheckIn: today };
}

// ─── Weekly Summary ────────────────────────────────────────────────────────

export function getWeeklySummary(): WeeklySummary | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.WEEKLY);
  return raw ? JSON.parse(raw) : null;
}

export function saveWeeklySummary(summary: WeeklySummary): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.WEEKLY, JSON.stringify(summary));
}

// ─── Context Builder (AI için) ─────────────────────────────────────────────

export function buildUserContext(profile: UserProfile, lastN = 5): string {
  const journal = getJournal().slice(0, lastN);
  const parts: string[] = [];

  parts.push(`Kullanıcı adı: ${profile.name}`);

  if (profile.primaryBirthCard) {
    parts.push(`Doğum kartı: ${profile.primaryBirthCard.nameTR} (${profile.primaryBirthCard.keywordsTR.join(", ")})`);
  }

  if (profile.focus?.length) {
    const focusLabels: Record<string, string> = {
      love: "Aşk & İlişkiler", career: "Kariyer", inner: "İç Dünya",
      spiritual: "Ruhsal Büyüme", decisions: "Kararlar", healing: "Şifa",
    };
    parts.push(`Odak alanları: ${profile.focus.map(f => focusLabels[f] || f).join(", ")}`);
  }

  if (journal.length > 0) {
    const recentCards = journal
      .flatMap(e => e.cards?.map(c => c.card.nameTR) || [])
      .slice(0, 8);
    if (recentCards.length) {
      parts.push(`Son okumalarda çıkan kartlar: ${recentCards.join(", ")}`);
    }

    const recentQuestions = journal
      .filter(e => e.question)
      .slice(0, 3)
      .map(e => `"${e.question}"`);
    if (recentQuestions.length) {
      parts.push(`Son sorular: ${recentQuestions.join(", ")}`);
    }
  }

  if (profile.lastIntention) {
    parts.push(`Bugünkü niyeti: "${profile.lastIntention}"`);
  }

  return parts.join("\n");
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
