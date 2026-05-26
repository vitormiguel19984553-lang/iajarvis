import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { UIMessage } from "ai";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatWindow } from "@/components/chat-window";
import { useThreads } from "@/lib/use-threads";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Lumen — AI Assistant" },
      {
        name: "description",
        content: "A fast, focused AI chat assistant. Ask anything, get clear answers.",
      },
    ],
  }),
});

function Index() {
  const {
    threads,
    activeId,
    setActiveId,
    createThread,
    deleteThread,
    updateThread,
    renameThread,
    hydrated,
  } = useThreads();
  const [collapsed, setCollapsed] = useState(false);

  // Ensure there's always an active thread
  useEffect(() => {
    if (hydrated && !activeId) createThread();
  }, [hydrated, activeId, createThread]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <ChatSidebar
        threads={threads}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createThread}
        onDelete={deleteThread}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="flex-1 min-w-0">
        {active && (
          <ChatWindow
            key={active.id}
            thread={active}
            onMessagesChange={(messages: UIMessage[]) =>
              updateThread(active.id, { messages })
            }
            onFirstUserMessage={(text) => {
              const title = text.length > 48 ? text.slice(0, 48).trim() + "…" : text;
              renameThread(active.id, title);
            }}
          />
        )}
      </main>
    </div>
  );
}
