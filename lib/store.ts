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
  isPremium: boolean;
  createdAt: string;
  streak: number;
  lastCheckIn?: string;
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
}

const STORAGE_KEYS = {
  PROFILE: "pollux_profile",
  JOURNAL: "pollux_journal",
  ONBOARDED: "pollux_onboarded",
};

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
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

export function getJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEYS.JOURNAL);
  return raw ? JSON.parse(raw) : [];
}

export function addJournalEntry(entry: JournalEntry): void {
  if (typeof window === "undefined") return;
  const existing = getJournal();
  const updated = [entry, ...existing];
  localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
}

export function updateJournalEntry(id: string, updates: Partial<JournalEntry>): void {
  if (typeof window === "undefined") return;
  const existing = getJournal();
  const updated = existing.map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function updateStreak(profile: UserProfile): UserProfile {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (profile.lastCheckIn === today) return profile;

  const newStreak = profile.lastCheckIn === yesterday ? (profile.streak || 0) + 1 : 1;

  return { ...profile, streak: newStreak, lastCheckIn: today };
}
