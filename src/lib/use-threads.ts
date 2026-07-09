import { useEffect, useState, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  loaded: boolean;
};

export function useThreads(userId: string | undefined) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Per-thread set of UI-message ids already persisted to DB.
  const savedIdsRef = useRef<Map<string, Set<string>>>(new Map());

  // Load conversations + messages for active thread
  useEffect(() => {
    if (!userId) {
      setThreads([]);
      setActiveId(null);
      setHydrated(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      const list: Thread[] = (convs ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: new Date(c.created_at).getTime(),
        updatedAt: new Date(c.updated_at).getTime(),
        messages: [],
        loaded: false,
      }));
      setThreads(list);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeId) return;
    const t = threads.find((x) => x.id === activeId);
    if (!t || t.loaded) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, parts, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      const msgs: UIMessage[] = (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: m.content }],
      }));
      const set = new Set(msgs.map((m) => m.id));
      savedIdsRef.current.set(activeId, set);
      setThreads((prev) =>
        prev.map((x) => (x.id === activeId ? { ...x, messages: msgs, loaded: true } : x)),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const createThread = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: "Nova conversa" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error || !data) return null;
    const t: Thread = {
      id: data.id,
      title: data.title,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      messages: [],
      loaded: true,
    };
    savedIdsRef.current.set(t.id, new Set());
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    return t.id;
  }, [userId]);

  const deleteThread = useCallback(
    async (id: string) => {
      await supabase.from("messages").delete().eq("conversation_id", id);
      await supabase.from("conversations").delete().eq("id", id);
      savedIdsRef.current.delete(id);
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId],
  );

  const updateThread = useCallback((id: string, patch: Partial<Thread>) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)),
    );
    // Persist new messages
    if (patch.messages) {
      const saved = savedIdsRef.current.get(id) ?? new Set<string>();
      savedIdsRef.current.set(id, saved);
      const fresh = patch.messages.filter((m) => !saved.has(m.id));
      if (fresh.length > 0) {
        fresh.forEach((m) => saved.add(m.id));
        const rows = fresh.map((m) => ({
          conversation_id: id,
          role: m.role,
          content: (m.parts ?? [])
            .map((p) => ((p as { type: string; text?: string }).type === "text" ? (p as { text?: string }).text ?? "" : ""))
            .join(""),
          parts: JSON.parse(JSON.stringify(m.parts ?? [])),
        }));
        supabase.from("messages").insert(rows).then(({ error }) => {
          if (error) console.error("Failed to save messages", error);
        });
      }
    }
  }, []);

  const renameThread = useCallback(
    async (id: string, title: string) => {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t)),
      );
      await supabase.from("conversations").update({ title }).eq("id", id);
    },
    [],
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
