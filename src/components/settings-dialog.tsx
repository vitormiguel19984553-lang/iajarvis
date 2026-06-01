import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MODEL_CATALOG,
  CATEGORY_LABEL,
  canUseModel,
  type ModelCategory,
  type ModelId,
  type PlanTier,
} from "@/lib/models";
import type { LearnedSkill, Settings } from "@/lib/use-settings";
import { Lock, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  skills: LearnedSkill[];
  removeSkill: (id: string) => void;
  clearSkills: () => void;
  plan?: PlanTier;
}

const PLAN_BADGE: Record<PlanTier, { label: string; cls: string; style?: React.CSSProperties }> = {
  free: { label: "FREE", cls: "bg-muted text-muted-foreground" },
  pro: {
    label: "PRO",
    cls: "border",
    style: {
      color: "var(--accent-cyan)",
      background: "color-mix(in oklab, var(--accent-cyan) 12%, transparent)",
      borderColor: "color-mix(in oklab, var(--accent-cyan) 30%, transparent)",
      fontFamily: "var(--font-display)",
    },
  },
  ultra: {
    label: "ULTRA",
    cls: "border",
    style: {
      color: "var(--premium)",
      background: "color-mix(in oklab, var(--premium) 14%, transparent)",
      borderColor: "color-mix(in oklab, var(--premium) 35%, transparent)",
      fontFamily: "var(--font-display)",
    },
  },
};

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  updateSettings,
  skills,
  removeSkill,
  clearSkills,
  plan = "free",
}: Props) {
  const grouped = MODEL_CATALOG.reduce<Record<string, typeof MODEL_CATALOG>>(
    (acc, m) => {
      if (m.id === "auto") return acc;
      (acc[m.category] ||= []).push(m);
      return acc;
    },
    {},
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-elevated border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize J.A.R.V.I.S — instructions, model, and memory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Instruction prompt */}
          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Instruction prompt
            </div>
            <p className="text-[11.5px] text-muted-foreground mb-2">
              Tell the AI how to behave, what tone to use, or what to focus on.
            </p>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
              rows={5}
              className="w-full bg-background border border-border rounded-lg p-3 text-[12.5px] text-foreground outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
              placeholder="e.g. You are a careful research assistant. Always cite sources…"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10.5px] text-muted-foreground">
                {settings.systemPrompt.length} chars
              </span>
              <button
                onClick={() => {
                  updateSettings({
                    systemPrompt:
                      "You are J.A.R.V.I.S — a sharp, helpful, slightly witty AI assistant. Respond clearly, use markdown when useful, code blocks for code, and be concise unless depth is requested.",
                  });
                  toast.success("Reset to default");
                }}
                className="text-[11px] text-[#00d4ff] hover:underline"
              >
                Reset
              </button>
            </div>
          </section>

          {/* Model */}
          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Model
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => updateSettings({ modelMode: "auto" })}
                className={`flex-1 text-[12px] py-2 rounded-lg border transition-colors ${
                  settings.modelMode === "auto"
                    ? "border-[#00d4ff] bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto (best for task)
              </button>
              <button
                onClick={() => updateSettings({ modelMode: "manual" })}
                className={`flex-1 text-[12px] py-2 rounded-lg border transition-colors ${
                  settings.modelMode === "manual"
                    ? "border-[#00d4ff] bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual
              </button>
            </div>
            {settings.modelMode === "manual" && (
              <div className="max-h-72 overflow-y-auto scroll-thin border border-border rounded-lg divide-y divide-border">
                {(Object.keys(grouped) as ModelCategory[]).map((cat) => (
                  <div key={cat}>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 font-semibold">
                      {CATEGORY_LABEL[cat]}
                    </div>
                    {grouped[cat].map((m) => {
                      const allowed = canUseModel(plan, m.id);
                      const selected = settings.manualModel === m.id;
                      const badge = PLAN_BADGE[m.minPlan];
                      return (
                        <button
                          key={m.id}
                          disabled={!allowed}
                          onClick={() => {
                            updateSettings({ manualModel: m.id as ModelId });
                            toast.success(`Modelo: ${m.label}`);
                          }}
                          title={m.gatewayId ? `Encaminhado para ${m.gatewayId}` : m.label}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                            selected
                              ? "bg-[rgba(0,212,255,0.08)] text-[#00d4ff]"
                              : allowed
                                ? "text-foreground hover:bg-background/60"
                                : "text-muted-foreground/60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12.5px] font-medium flex items-center gap-1.5">
                              {m.label}
                              {m.isNew && (
                                <span className="text-[9px] px-1 rounded bg-[#22c55e]/20 text-[#22c55e] font-semibold">
                                  NEW
                                </span>
                              )}
                              {m.gatewayId && (
                                <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-400/80">
                                  fallback
                                </span>
                              )}
                            </span>
                            <span className="text-[10.5px] text-muted-foreground">
                              {m.provider} · {m.tag}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${badge.cls}`}>
                              {badge.label}
                            </span>
                            {!allowed && <Lock className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {settings.modelMode === "auto" && (
              <p className="text-[11px] text-muted-foreground">
                Router escolhe entre {MODEL_CATALOG.length - 1} modelos consoante a tarefa
                (código → GPT-5.4, raciocínio → GPT-5.5, multimodal → Gemini 2.5 Pro, …).
              </p>
            )}
          </section>

          {/* Generative brain */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Generative brain · {skills.length} skills
              </div>
              {skills.length > 0 && (
                <button
                  onClick={() => {
                    clearSkills();
                    toast.success("Cleared all learned skills");
                  }}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11.5px] text-muted-foreground mb-2">
              After each successful reply, the AI distills one durable skill and stores
              it locally. These are injected into the system prompt of every new
              conversation.
            </p>
            <div className="max-h-48 overflow-y-auto scroll-thin flex flex-col gap-1.5">
              {skills.length === 0 && (
                <div className="text-[12px] text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  No skills learned yet. Have a conversation to start.
                </div>
              )}
              {skills.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-start gap-2 p-2 rounded-md bg-background border border-border"
                >
                  <span className="text-[11px] text-[#00d4ff] mt-0.5">◆</span>
                  <span className="flex-1 text-[12px] text-foreground/90 leading-relaxed">
                    {s.text}
                  </span>
                  <button
                    onClick={() => removeSkill(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Shortcuts
            </div>
            <div className="space-y-1.5">
              {[
                ["Enter", "Send message"],
                ["Shift + Enter", "New line"],
                ["Esc", "Close modal"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono text-foreground bg-background border border-border rounded px-2 py-0.5">
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
