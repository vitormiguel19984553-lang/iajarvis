import { useEffect, useState, useCallback } from "react";
import type { UIMessage } from "ai";

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

const STORAGE_KEY = "lovable-chat-threads-v1";

function load(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Thread[];
  } catch {
    return [];
  }
}

function save(threads: Thread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const list = load();
    setThreads(list);
    if (list.length > 0) setActiveId(list[0].id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(threads);
  }, [threads, hydrated]);

  const createThread = useCallback(() => {
    const t: Thread = {
      id: makeId(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    return t.id;
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId],
  );

  const updateThread = useCallback(
    (id: string, patch: Partial<Thread>) => {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)),
      );
    },
    [],
  );

  const renameThread = useCallback(
    (id: string, title: string) => updateThread(id, { title }),
    [updateThread],
  );

  return {
    threads,
    activeId,
    setActiveId,
    createThread,
    deleteThread,
    updateThread,
    renameThread,
    hydrated,
  };
}
