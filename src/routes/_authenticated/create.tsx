import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Loader2,
  Lock,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import {
  CREATE_CATEGORIES,
  CREATE_CATEGORY_LABEL,
  CREATE_TOOLS,
  canUseTool,
  type CreateCategory,
  type CreateTool,
} from "@/lib/create-tools";
import {
  base64ToBlob,
  deleteCreation,
  fileToBase64,
  listCreations,
  saveCreation,
  signCreation,
  type CreationRow,
} from "@/lib/creations";

export const Route = createFileRoute("/_authenticated/create")({
  component: CreatePage,
  head: () => ({
    meta: [
      { title: "Criar — J.A.R.V.I.S." },
      {
        name: "description",
        content:
          "Módulo Criar do J.A.R.V.I.S.: gera imagens, edita fotos, cria vozes, transcreve áudio e escreve conteúdo com IA.",
      },
      { property: "og:title", content: "Criar — J.A.R.V.I.S." },
      {
        property: "og:description",
        content: "Mais de 70 ferramentas criativas de IA num só painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Result =
  | { kind: "image"; url: string; blob: Blob }
  | { kind: "audio"; url: string; blob: Blob }
  | { kind: "text"; text: string }
  | null;

function CreatePage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const plan = profile?.plan_type ?? "free";

  const [category, setCategory] = useState<CreateCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState<CreateTool | null>(null);
  const [prompt, setPrompt] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [gallery, setGallery] = useState<CreationRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const tools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CREATE_TOOLS.filter(
      (t) =>
        (category === "all" || t.category === category) &&
        (!q ||
          t.label.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)),
    );
  }, [category, query]);

  const refreshGallery = useCallback(async () => {
    const rows = await listCreations();
    setGallery(rows);
    const next: Record<string, string> = {};
    await Promise.all(
      rows
        .filter((r) => r.kind === "image" && r.storage_path)
        .slice(0, 24)
        .map(async (r) => {
          const url = await signCreation(r.storage_path!);
          if (url) next[r.id] = url;
        }),
    );
    setThumbs(next);
  }, []);

  useEffect(() => {
    if (user) refreshGallery();
  }, [user, refreshGallery]);

  const selectTool = (t: CreateTool) => {
    if (!canUseTool(plan, t.id)) {
      toast.error(`Ferramenta ${t.minPlan.toUpperCase()}`, {
        description: "Faz upgrade de plano para desbloquear.",
        action: { label: "Ver planos", onClick: () => navigate({ to: "/planos" }) },
      });
      return;
    }
    setTool(t);
    setResult(null);
    setPrompt("");
    setInputFile(null);
    setInputPreview(null);
    const defaults: Record<string, string> = {};
    for (const f of t.fields ?? []) {
      if (f.options?.length && !f.optional) defaults[f.id] = f.options[0];
    }
    setFields(defaults);
  };

  const pickFile = (file: File | undefined) => {
    if (!file || !tool) return;
    const isAudio = tool.engine === "stt";
    if (isAudio && !file.type.startsWith("audio/")) {
      return toast.error("Escolhe um ficheiro de áudio");
    }
    if (!isAudio && !file.type.startsWith("image/")) {
      return toast.error("Escolhe um ficheiro de imagem");
    }
    setInputFile(file);
    setInputPreview(isAudio ? null : URL.createObjectURL(file));
  };

  const authHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Faz login novamente.");
    return { Authorization: `Bearer ${token}` };
  };

  const run = async () => {
    if (!tool || !user) return;
    const needsFile = tool.engine === "image-edit" || tool.engine === "stt";
    if (needsFile && !inputFile) {
      return toast.error(tool.engine === "stt" ? "Anexa um áudio" : "Anexa uma imagem");
    }
    if (!needsFile && !prompt.trim()) return toast.error("Escreve o teu pedido");

    setBusy(true);
    setResult(null);
    try {
      const headers = await authHeader();

      if (tool.engine === "text") {
        const res = await fetch("/api/create-text", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ toolId: tool.id, prompt, fields }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
        setResult({ kind: "text", text: json.text });
        await saveCreation({
          userId: user.id,
          toolId: tool.id,
          toolLabel: tool.label,
          kind: "text",
          prompt,
          outputText: json.text,
        });
      } else if (tool.engine === "image" || tool.engine === "image-edit") {
        const image = inputFile
          ? { mimeType: inputFile.type, base64: await fileToBase64(inputFile) }
          : undefined;
        const res = await fetch("/api/create-image", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ toolId: tool.id, prompt, fields, image }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
        const blob = base64ToBlob(json.b64, "image/png");
        setResult({ kind: "image", url: URL.createObjectURL(blob), blob });
        await saveCreation({
          userId: user.id,
          toolId: tool.id,
          toolLabel: tool.label,
          kind: "image",
          prompt,
          file: { blob, ext: "png" },
        });
      } else if (tool.engine === "tts") {
        const res = await fetch("/api/create-tts", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ toolId: tool.id, prompt, fields }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Erro ${res.status}`);
        }
        const blob = await res.blob();
        setResult({ kind: "audio", url: URL.createObjectURL(blob), blob });
        await saveCreation({
          userId: user.id,
          toolId: tool.id,
          toolLabel: tool.label,
          kind: "audio",
          prompt,
          file: { blob, ext: "mp3" },
        });
      } else {
        const form = new FormData();
        form.set("toolId", tool.id);
        form.set("file", inputFile!);
        const res = await fetch("/api/create-stt", { method: "POST", headers, body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
        setResult({ kind: "text", text: json.text });
        await saveCreation({
          userId: user.id,
          toolId: tool.id,
          toolLabel: tool.label,
          kind: "text",
          prompt: inputFile!.name,
          outputText: json.text,
        });
      }

      toast.success("Criado com sucesso");
      refreshGallery();
    } catch (e) {
      const msg = (e as Error).message;
      if (/upgrade_required/.test(msg)) {
        toast.error("Plano insuficiente", { description: "Faz upgrade para usar esta ferramenta." });
      } else if (/rate_limited/.test(msg)) {
        toast.error("Demasiados pedidos", { description: "Espera um minuto e tenta de novo." });
      } else {
        toast.error("Falhou", { description: msg.slice(0, 200) });
      }
    } finally {
      setBusy(false);
    }
  };

  const download = (blobOrText: Result) => {
    if (!blobOrText || !tool) return;
    const name = `jarvis-${tool.id}-${Date.now()}`;
    const a = document.createElement("a");
    if (blobOrText.kind === "text") {
      a.href = URL.createObjectURL(new Blob([blobOrText.text], { type: "text/markdown" }));
      a.download = `${name}.md`;
    } else {
      a.href = blobOrText.url;
      a.download = `${name}.${blobOrText.kind === "image" ? "png" : "mp3"}`;
    }
    a.click();
  };

  const removeCreation = async (row: CreationRow) => {
    try {
      await deleteCreation(row);
      setGallery((g) => g.filter((r) => r.id !== row.id));
      toast.success("Removido");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-muted-foreground">
        A carregar…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full text-foreground overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{ background: "var(--gradient-halo)" }}
      />

      <header className="glass-panel border-0 border-b border-[color:var(--sidebar-border)] px-4 md:px-6 py-4 flex items-center gap-3 rounded-none">
        <button
          onClick={() => navigate({ to: "/chat" })}
          aria-label="Voltar ao chat"
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Wand2 className="h-5 w-5 text-[color:var(--accent-cyan)]" />
        <h1 className="text-lg font-semibold tracking-tight font-display">Criar</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {CREATE_TOOLS.length} ferramentas
        </span>
        <div className="flex-1" />
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border border-border/60 text-muted-foreground">
          plano {plan}
        </span>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Catálogo */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar ferramenta…"
              className="pl-9"
              aria-label="Procurar ferramenta"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory("all")}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md border transition-colors",
                category === "all"
                  ? "border-[color:var(--accent-cyan)] text-[color:var(--accent-cyan)]"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              Todas
            </button>
            {CREATE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md border transition-colors",
                  category === c
                    ? "border-[color:var(--accent-cyan)] text-[color:var(--accent-cyan)]"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {CREATE_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[62vh] overflow-y-auto pr-1">
            {tools.map((t) => {
              const locked = !canUseTool(plan, t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => selectTool(t)}
                  className={cn(
                    "w-full text-left glass-panel rounded-lg px-3 py-2.5 border transition-colors",
                    tool?.id === t.id
                      ? "border-[color:var(--accent-cyan)]"
                      : "border-border/50 hover:border-border",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{t.label}</span>
                    {locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {t.minPlan !== "free" && (
                      <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground">
                        {t.minPlan}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {t.description}
                  </p>
                </button>
              );
            })}
            {tools.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhuma ferramenta encontrada
              </p>
            )}
          </div>
        </section>

        {/* Painel de execução */}
        <section className="space-y-6 min-w-0">
          {!tool ? (
            <div className="glass-panel hud-border rounded-xl p-10 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-4 text-[color:var(--accent-cyan)]" />
              <h2 className="text-base font-display mb-1">Escolhe uma ferramenta</h2>
              <p className="text-sm text-muted-foreground">
                Imagens, edição de fotos, vozes, transcrições, textos, código e negócio.
              </p>
            </div>
          ) : (
            <div className="glass-panel hud-border rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-base font-display">{tool.label}</h2>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>

              {(tool.engine === "image-edit" || tool.engine === "stt") && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                  className="rounded-lg border border-dashed border-border/70 p-4 text-center"
                >
                  {inputPreview ? (
                    <img
                      src={inputPreview}
                      alt="Ficheiro de entrada"
                      className="max-h-48 mx-auto rounded-md"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4" />
                      {inputFile
                        ? inputFile.name
                        : tool.engine === "stt"
                          ? "Arrasta um áudio ou escolhe"
                          : "Arrasta uma imagem ou escolhe"}
                    </p>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept={tool.engine === "stt" ? "audio/*" : "image/*"}
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => fileRef.current?.click()}
                  >
                    Escolher ficheiro
                  </Button>
                </div>
              )}

              {tool.engine !== "stt" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {tool.promptLabel ?? (tool.engine === "tts" ? "Texto a narrar" : "O teu pedido")}
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={tool.promptPlaceholder ?? "Descreve o que queres…"}
                    rows={tool.engine === "tts" || tool.engine === "text" ? 6 : 3}
                    className="text-base md:text-sm"
                  />
                </div>
              )}

              {(tool.fields?.length ?? 0) > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {tool.fields!.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      {f.type === "select" ? (
                        <Select
                          value={fields[f.id] ?? ""}
                          onValueChange={(v) => setFields((s) => ({ ...s, [f.id]: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Automático" />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={fields[f.id] ?? ""}
                          onChange={(e) => setFields((s) => ({ ...s, [f.id]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={run} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A criar…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> Criar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="glass-panel hud-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Resultado</h3>
                <Button size="sm" variant="ghost" onClick={() => download(result)}>
                  <Download className="h-4 w-4 mr-2" /> Descarregar
                </Button>
              </div>
              {result.kind === "image" && (
                <img src={result.url} alt="Resultado gerado" className="rounded-lg w-full" />
              )}
              {result.kind === "audio" && <audio controls src={result.url} className="w-full" />}
              {result.kind === "text" && (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans max-h-[50vh] overflow-y-auto">
                  {result.text}
                </pre>
              )}
            </div>
          )}

          {/* Galeria */}
          <div className="glass-panel hud-border rounded-xl">
            <div className="px-5 py-3 border-b border-border/60 text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[color:var(--accent-cyan)]" /> Galeria (
              {gallery.length})
            </div>
            {gallery.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Ainda não criaste nada. As tuas criações aparecem aqui.
              </p>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {gallery.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/50 overflow-hidden">
                    {row.kind === "image" && thumbs[row.id] ? (
                      <img
                        src={thumbs[row.id]}
                        alt={row.prompt ?? row.tool_label}
                        loading="lazy"
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div className="h-28 p-2 text-[11px] text-muted-foreground overflow-hidden">
                        {row.output_text?.slice(0, 160) ?? row.prompt ?? "—"}
                      </div>
                    )}
                    <div className="px-2 py-1.5 flex items-center gap-1">
                      <span className="text-[10px] truncate flex-1">{row.tool_label}</span>
                      <button
                        onClick={() => removeCreation(row)}
                        aria-label="Apagar criação"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
