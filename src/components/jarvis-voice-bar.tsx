import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, ArrowUp, Square, AudioLines, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  onStop: () => void;
  onAttachClick: () => void;
  onOpenVoiceMode: () => void;
}

function Orb({ listening, recording }: { listening: boolean; recording: boolean }) {
  const active = listening || recording;
  return (
    <div className="relative w-[80px] h-[80px] flex items-center justify-center shrink-0">
      {active && (
        <>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${recording ? "#ef4444" : "#3ee6ff"}`,
              animation: "orbRing 1.8s ease-out infinite",
              opacity: 0.4,
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${recording ? "#ef4444" : "#3ee6ff"}`,
              animation: "orbRing 1.8s ease-out 0.6s infinite",
              opacity: 0.25,
            }}
          />
        </>
      )}
      <div
        className="rounded-full flex items-center justify-center transition-all"
        style={{
          width: active ? 56 : 44,
          height: active ? 56 : 44,
          background: recording
            ? "radial-gradient(circle at 35% 35%, #fca5a5, #ef4444, #7f1d1d)"
            : listening
              ? "radial-gradient(circle at 35% 35%, #22eeff, #0a7aff, #7c3aed)"
              : "radial-gradient(circle at 35% 35%, #3a3a5a, #1a1a2e)",
          border: `1.5px solid ${active ? (recording ? "#ef4444" : "#3ee6ff") : "rgba(62, 230, 255,0.12)"}`,
          boxShadow: active
            ? `0 0 24px ${recording ? "rgba(239,68,68,0.5)" : "rgba(62, 230, 255,0.5)"}`
            : "none",
        }}
      >
        <Mic className="h-[18px] w-[18px]" color={active ? "#fff" : "#6b7280"} strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function JarvisVoiceBar({
  input,
  setInput,
  onSubmit,
  isBusy,
  onStop,
  onAttachClick,
  onOpenVoiceMode,
}: Props) {
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const waveRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  useEffect(() => {
    let frame: number;
    const active = listening || recording;
    if (active && waveRef.current) {
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
  }, [listening, recording]);

  const toggleMic = () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setInput(transcript);
      };
      rec.onend = () => setListening(false);
      rec.onerror = (ev: any) => {
        if (ev.error === "not-allowed") {
          toast.error("Microphone blocked. Allow access in browser settings.");
        }
        setListening(false);
      };
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not start microphone");
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : undefined;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        const url = URL.createObjectURL(blob);
        const sizeKB = (blob.size / 1024).toFixed(1);
        toast.success(`Recording saved (${sizeKB} KB)`, {
          action: { label: "Play", onClick: () => new Audio(url).play() },
        });
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Microphone permission denied");
      } else {
        toast.error("Could not access microphone");
      }
    }
  };

  return (
    <div className="border-t border-border bg-sidebar px-5 py-3.5 flex flex-col gap-3 shrink-0 kb-safe-bottom sticky bottom-0 z-10">
      <div className="bg-background border border-border rounded-xl px-4 py-2.5 flex items-center gap-3.5">
        <Orb listening={listening} recording={recording} />
        <div className="flex-1 min-w-0">
          <div ref={waveRef} className="flex items-center gap-[2px] h-8">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  width: 3,
                  borderRadius: 2,
                  background:
                    listening || recording
                      ? recording
                        ? "#ef4444"
                        : "#3ee6ff"
                      : "rgba(62, 230, 255,0.2)",
                  height: 5,
                  transition:
                    listening || recording ? "height 0.1s" : "height 0.4s ease",
                }}
              />
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {recording
              ? "Recording audio… tap stop to finish"
              : listening
                ? "Listening… speak now"
                : "Mic = dictate · Record = save audio · Live = voice chat"}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={toggleMic}
            title="Dictate (speech to text)"
            className={cn(
              "w-10 h-10 rounded-[10px] border flex items-center justify-center transition-all",
              listening
                ? "border-[#3ee6ff] bg-[rgba(62, 230, 255,0.12)] text-[#3ee6ff]"
                : "border-border text-muted-foreground hover:text-[#3ee6ff]",
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            onClick={toggleRecording}
            title="Record audio"
            className={cn(
              "w-10 h-10 rounded-[10px] border flex items-center justify-center transition-all",
              recording
                ? "border-[#ef4444] bg-[rgba(239,68,68,0.12)] text-[#ef4444]"
                : "border-border text-muted-foreground hover:text-[#ef4444]",
            )}
          >
            <AudioLines className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenVoiceMode}
            title="Open live voice chat"
            className="w-10 h-10 rounded-[10px] border border-border text-muted-foreground hover:text-[#7c3aed] hover:border-[rgba(124,58,237,0.4)] flex items-center justify-center transition-all"
          >
            <Radio className="h-4 w-4" />
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-2 items-end"
      >
        <button
          type="button"
          onClick={onAttachClick}
          title="Attach files"
          className="w-9 h-9 rounded-lg border border-border bg-transparent flex items-center justify-center text-muted-foreground hover:text-[#3ee6ff] transition-colors shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <div className="flex-1 bg-background border border-border rounded-[10px] px-3.5 py-2.5 flex items-center focus-within:border-[rgba(62, 230, 255,0.35)] transition-colors">
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
            className="w-full bg-transparent border-0 resize-none text-[16px] md:text-[13px] leading-6 outline-none placeholder:text-muted-foreground max-h-[120px]"
          />
        </div>
        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-[#3ee6ff] hover:bg-[rgba(62, 230, 255,0.1)] transition-colors shrink-0"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-[#3ee6ff] hover:bg-[rgba(62, 230, 255,0.1)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
