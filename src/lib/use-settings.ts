import { useEffect, useState, useCallback } from "react";
import type { ModelId } from "./models";

export type Settings = {
  systemPrompt: string;
  modelMode: "auto" | "manual";
  manualModel: ModelId;
  voiceEnabled: boolean;
};

export type LearnedSkill = {
  id: string;
  text: string;
  createdAt: number;
};

const SETTINGS_KEY = "jarvis-settings-v1";
const SKILLS_KEY = "jarvis-skills-v1";

const DEFAULTS: Settings = {
  systemPrompt:
    "You are J.A.R.V.I.S — a sharp, helpful, slightly witty AI assistant. Respond clearly, use markdown when useful, code blocks for code, and be concise unless depth is requested.",
  modelMode: "auto",
  manualModel: "google/gemini-3-flash-preview",
  voiceEnabled: true,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [skills, setSkills] = useState<LearnedSkill[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(read(SETTINGS_KEY, DEFAULTS));
    try {
      const raw = localStorage.getItem(SKILLS_KEY);
      if (raw) setSkills(JSON.parse(raw));
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  }, [skills, hydrated]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const addSkill = useCallback((text: string) => {
    const clean = text.trim().replace(/^["'\-•*\s]+|["'\s]+$/g, "");
    if (!clean || clean.length < 6 || clean.length > 240) return;
    setSkills((prev) => {
      // dedupe (case-insensitive)
      if (prev.some((s) => s.text.toLowerCase() === clean.toLowerCase())) return prev;
      const next = [
        { id: Math.random().toString(36).slice(2), text: clean, createdAt: Date.now() },
        ...prev,
      ];
      return next.slice(0, 40);
    });
  }, []);

  const removeSkill = useCallback((id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSkills = useCallback(() => setSkills([]), []);

  return { settings, update, skills, addSkill, removeSkill, clearSkills, hydrated };
}
