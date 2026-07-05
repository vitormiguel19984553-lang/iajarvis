import { useEffect, useRef, useState, useCallback } from "react";
import { X, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the final transcript when user pauses speaking */
  onUserSpeech: (text: string) => Promise<string | null>;
}

/**
 * Live voice conversation overlay.
 * - SpeechRecognition listens continuously for user speech
 * - On final result, sends to AI via onUserSpeech callback
 * - AI reply is spoken via SpeechSynthesis
 * - While AI speaks, mic is muted to avoid feedback
 */
export function VoiceMode({ open, onClose, onUserSpeech }: Props) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastReply, setLastReply] = useState("");
  const [statusText, setStatusText] = useState("Tap mic to start");
  const recRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      // resume listening after AI finishes
      if (shouldListenRef.current) startListening();
    };
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const handleFinal = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setStatusText("Thinking…");
      // stop listening while AI responds
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      const reply = await onUserSpeech(trimmed);
      if (reply) {
        setLastReply(reply);
        setStatusText("Speaking…");
        speak(reply);
      } else {
        setStatusText("Listening…");
        if (shouldListenRef.current) startListening();
      }
    },
    [onUserSpeech, speak],
  );

  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice not supported in this browser");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        setTranscript(final || interim);
        if (final) handleFinal(final);
      };
      rec.onerror = (ev: any) => {
        if (ev.error === "not-allowed") {
          toast.error("Microphone blocked. Allow access in browser.");
          shouldListenRef.current = false;
          setListening(false);
        }
      };
      rec.onend = () => {
        setListening(false);
        // auto-restart if still in conversation mode and not speaking
        if (shouldListenRef.current && !speaking) {
          setTimeout(() => {
            if (shouldListenRef.current && !speaking) startListening();
          }, 200);
        }
      };
      rec.start();
      recRef.current = rec;
      setListening(true);
      setStatusText("Listening…");
    } catch (err) {
      console.error(err);
      setListening(false);
    }
  }, [handleFinal, speaking]);

  const toggle = useCallback(() => {
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
      setListening(false);
      setSpeaking(false);
      setStatusText("Paused");
    } else {
      shouldListenRef.current = true;
      startListening();
    }
  }, [startListening]);

  useEffect(() => {
    if (!open) {
      shouldListenRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
      setListening(false);
      setSpeaking(false);
      setTranscript("");
      setLastReply("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="text-[11px] uppercase tracking-[0.3em] text-[#3ee6ff] mb-6">
        Live voice mode
      </div>

      <div className="relative w-[220px] h-[220px] flex items-center justify-center mb-10">
        {(listening || speaking) && (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid #3ee6ff",
                animation: "orbRing 2s ease-out infinite",
                opacity: 0.35,
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid #7c3aed",
                animation: "orbRing 2s ease-out 0.7s infinite",
                opacity: 0.25,
              }}
            />
          </>
        )}
        <div
          className="rounded-full flex items-center justify-center transition-all"
          style={{
            width: speaking ? 180 : listening ? 160 : 130,
            height: speaking ? 180 : listening ? 160 : 130,
            background: speaking
              ? "radial-gradient(circle at 35% 35%, #c084fc, #7c3aed, #4c1d95)"
              : listening
                ? "radial-gradient(circle at 35% 35%, #22eeff, #0a7aff, #7c3aed)"
                : "radial-gradient(circle at 35% 35%, #3a3a5a, #1a1a2e)",
            boxShadow:
              speaking || listening
                ? "0 0 60px rgba(62, 230, 255,0.4)"
                : "0 0 20px rgba(62, 230, 255,0.15)",
          }}
        />
      </div>

      <div className="text-[14px] text-foreground/90 font-medium mb-1">{statusText}</div>
      <div className="text-[12px] text-muted-foreground mb-8 h-4">
        {speaking ? "AI is speaking — wait" : listening ? "Speak naturally" : ""}
      </div>

      <div className="max-w-xl w-full px-6 space-y-3 min-h-[80px]">
        {transcript && (
          <div className="text-[13px] text-muted-foreground text-center italic">
            "{transcript}"
          </div>
        )}
        {lastReply && (
          <div className="text-[13px] text-foreground text-center">{lastReply}</div>
        )}
      </div>

      <button
        onClick={toggle}
        className="mt-10 h-14 w-14 rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: shouldListenRef.current ? "#3ee6ff" : "rgba(255,255,255,0.15)",
          background: shouldListenRef.current ? "rgba(62, 230, 255,0.12)" : "transparent",
          color: shouldListenRef.current ? "#3ee6ff" : "#9ca3af",
        }}
      >
        {shouldListenRef.current ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <div className="text-[11px] text-muted-foreground mt-3">
        {shouldListenRef.current ? "Tap to pause" : "Tap to start conversation"}
      </div>
    </div>
  );
}
