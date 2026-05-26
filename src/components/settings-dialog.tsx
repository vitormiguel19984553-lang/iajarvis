import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SHORTCUTS: Array<[string, string]> = [
  ["⌘ + Enter", "Send message"],
  ["⌘ + N", "New conversation"],
  ["⌘ + U", "Upload file"],
  ["⌘ + M", "Toggle microphone"],
  ["Esc", "Close modal"],
];

export function SettingsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-elevated border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize J.A.R.V.I.S to your preference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Model
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-foreground">Active model</span>
              <span className="text-[#00d4ff] font-mono">Gemini 3 Flash</span>
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Appearance
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-foreground">Theme</span>
              <span className="text-muted-foreground">Dark (locked)</span>
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Voice
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-foreground">Speech recognition</span>
              <span className="text-muted-foreground">Web Speech API</span>
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Shortcuts
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map(([key, label]) => (
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
