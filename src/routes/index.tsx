import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { JarvisSidebar } from "@/components/jarvis-sidebar";
import {
  JarvisRightPanel,
  type UploadedFile,
  type Activity,
} from "@/components/jarvis-right-panel";
import { ChatWindow } from "@/components/chat-window";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThreadListPanel } from "@/components/thread-list";
import { useThreads } from "@/lib/use-threads";
import { useSettings } from "@/lib/use-settings";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

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

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Index() {
  const {
    threads,
    activeId,
    setActiveId,
    createThread,
    updateThread,
    renameThread,
    deleteThread,
    hydrated,
  } = useThreads();
  const { settings, update: updateSettings, skills, addSkill, removeSkill, clearSkills } =
    useSettings();
  const [nav, setNav] = useState("chat");
  const [activeTab, setActiveTab] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && !activeId) createThread();
  }, [hydrated, activeId, createThread]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  const handleSidebar = (key: string) => {
    setNav(key);
    if (key === "settings") {
      setSettingsOpen(true);
    } else if (key === "files") {
      setActiveTab("files");
      setShowRightPanel(true);
    } else if (key === "stats") {
      setActiveTab("stats");
      setShowRightPanel(true);
    } else if (key === "chat") {
      setActiveTab("all");
      setShowRightPanel(true);
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const arr: UploadedFile[] = Array.from(list).map((f) => ({
      name: f.name,
      size: bytes(f.size),
      type: f.name.split(".").pop()?.toLowerCase() || "file",
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...arr]);
    toast.success(`${arr.length} file${arr.length > 1 ? "s" : ""} added`);
  };

  const section =
    activeTab === "files"
      ? "files"
      : activeTab === "activity"
        ? "activity"
        : activeTab === "stats"
          ? "stats"
          : "all";

  const totalMessages = threads.reduce((acc, t) => acc + t.messages.length, 0);
  const stats: Array<[string, string]> = [
    ["Conversations", String(threads.length)],
    ["Total messages", String(totalMessages)],
    ["Files loaded", String(files.length)],
    ["Skills learned", String(skills.length)],
    ["Model mode", settings.modelMode],
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <JarvisSidebar
        active={nav}
        onSelect={handleSidebar}
        onNewChat={() => {
          createThread();
          toast.success("New conversation started");
        }}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        historyOpen={historyOpen}
      />

      {historyOpen && (
        <ThreadListPanel
          threads={threads}
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          onDelete={(id) => {
            deleteThread(id);
            toast("Conversation deleted");
          }}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {active && (
        <ChatWindow
          key={active.id}
          thread={active}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAttachClick={() => fileInputRef.current?.click()}
          settings={settings}
          skills={skills}
          onLearnSkill={(text) => {
            addSkill(text);
            toast.success("New skill learned", { description: text });
          }}
          files={files}
          onActivityChange={setActivities}
          onMessagesChange={(messages: UIMessage[]) =>
            updateThread(active.id, { messages })
          }
          onFirstUserMessage={(text) => {
            const title = text.length > 48 ? text.slice(0, 48).trim() + "…" : text;
            renameThread(active.id, title);
          }}
        />
      )}
      {showRightPanel && (
        <JarvisRightPanel
          section={section}
          files={files}
          onAddFiles={(arr) => setFiles((prev) => [...prev, ...arr])}
          onRemoveFile={(name) => setFiles((prev) => prev.filter((f) => f.name !== name))}
          activities={activities}
          stats={stats}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        updateSettings={updateSettings}
        skills={skills}
        removeSkill={removeSkill}
        clearSkills={clearSkills}
      />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
