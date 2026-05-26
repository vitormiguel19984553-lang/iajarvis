import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { UIMessage } from "ai";
import { JarvisSidebar } from "@/components/jarvis-sidebar";
import { JarvisRightPanel } from "@/components/jarvis-right-panel";
import { ChatWindow } from "@/components/chat-window";
import { useThreads } from "@/lib/use-threads";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "J.A.R.V.I.S — AI Assistant" },
      {
        name: "description",
        content:
          "JARVIS-style AI conversation interface with voice, real-time activity, and file analysis.",
      },
    ],
  }),
});

function Index() {
  const { threads, activeId, createThread, updateThread, renameThread, hydrated } =
    useThreads();
  const [nav, setNav] = useState("chat");

  useEffect(() => {
    if (hydrated && !activeId) createThread();
  }, [hydrated, activeId, createThread]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <JarvisSidebar active={nav} onSelect={setNav} onNewChat={createThread} />
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
      <JarvisRightPanel />
    </div>
  );
}
