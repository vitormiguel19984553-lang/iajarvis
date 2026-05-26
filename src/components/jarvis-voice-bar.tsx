import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  onStop: () => void;
}

function Orb({ listening }: { listening: boolean }) {
  return (
    <div className="relative w-[80px] h-[80px] flex items-center justify-center shrink-0">
      {listening && (
        <>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid #00d4ff",
              animation: "orbRing 1.8s ease-out infinite",
              opacity: 0.4,
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid #00d4ff",
              animation: "orbRing 1.8s ease-out 0.6s infinite",
              opacity: 0.25,
            }}
          />
        </>
      )}
      <div
        className="rounded-full flex items-center justify-center transition-all"
        style={{
          width: listening ? 56 : 44,
          height: listening ? 56 : 44,
          background: listening
            ? "radial-gradient(circle at 35% 35%, #22eeff, #0a7aff, #7c3aed)"
            : "radial-gradient(circle at 35% 35%, #3a3a5a, #1a1a2e)",
          border: `1.5px solid ${listening ? "#00d4ff" : "rgba(0,212,255,0.12)"}`,
          boxShadow: listening ? "0 0 24px rgba(0,212,255,0.5)" : "none",
        }}
      >
        <Mic className="h-[18px] w-[18px]" color={listening ? "#fff" : "#6b7280"} strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function JarvisVoiceBar({ input, setInput, onSubmit, isBusy, onStop }: Props) {
  const [listening, setListening] = useState(false);
  const waveRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  // Demo waveform animation
  useEffect(() => {
    let frame: number;
    if (listening && waveRef.current) {
      const bars = waveRef.current.querySelectorAll<HTMLDivElement>(".bar");
      const animate = () => {
        bars.forEach((b) => {
          b.style.height = `${8 + Math.random() * 22}px`;
        });
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    } else if (waveRef.current) {
      waveRef.current.querySelectorAll<HTMLDivElement>(".bar").forEach((b) => {
        b.style.height = "5px";
      });
    }
    return () => cancelAnimationFrame(frame);
  }, [listening]);

  // Auto-stop after 4s (demo)
  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => setListening(false), 4000);
    return () => clearTimeout(t);
  }, [listening]);

  return (
    <div className="border-t border-border bg-sidebar px-5 py-3.5 flex flex-col gap-3 shrink-0">
      {/* Voice orb + waveform */}
      <div className="bg-background border border-border rounded-xl px-4 py-2.5 flex items-center gap-3.5">
        <Orb listening={listening} />
        <div className="flex-1 min-w-0">
          <div ref={waveRef} className="flex items-center gap-[2px] h-8">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  width: 3,
                  borderRadius: 2,
                  background: listening ? "#00d4ff" : "rgba(0,212,255,0.2)",
                  height: 5,
                  transition: listening ? "height 0.1s" : "height 0.4s ease",
                }}
              />
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {listening ? "Listening… speak now" : "Click mic to start voice input"}
          </div>
        </div>
        <button
          onClick={() => setListening((v) => !v)}
          className={cn(
            "w-10 h-10 rounded-[10px] border flex items-center justify-center transition-all",
            listening
              ? "border-[#00d4ff] bg-[rgba(0,212,255,0.12)] text-[#00d4ff]"
              : "border-border text-muted-foreground hover:text-[#00d4ff]",
          )}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      {/* Text row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-2 items-end"
      >
        <button
          type="button"
          className="w-9 h-9 rounded-lg border border-border bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <div className="flex-1 bg-background border border-border rounded-[10px] px-3.5 py-2.5 flex items-center focus-within:border-[rgba(0,212,255,0.35)] transition-colors">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            rows={1}
            placeholder="Message J.A.R.V.I.S… or use voice above"
            className="w-full bg-transparent border-0 resize-none text-[13px] leading-6 outline-none placeholder:text-muted-foreground max-h-[120px]"
          />
        </div>
        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)] transition-colors shrink-0"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
