import { useEffect } from "react";

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * Global keyboard shortcuts. Keys are of the form "mod+k", "mod+enter",
 * "mod+n", "esc", "mod+/", "mod+shift+k". "mod" = ctrl on Windows/Linux, cmd
 * on macOS. Ignored while typing inside inputs unless the shortcut uses mod.
 */
export function useShortcuts(map: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const parts: string[] = [];
      if (mod) parts.push("mod");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      const key = e.key.toLowerCase();
      if (!["control", "meta", "shift", "alt"].includes(key)) parts.push(key);
      const combo = parts.join("+");

      const target = e.target as HTMLElement | null;
      const inTextField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      // Allow modded shortcuts everywhere; unmodded ones only outside text fields.
      if (inTextField && !mod && key !== "escape") return;

      const fn = map[combo];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map]);
}
