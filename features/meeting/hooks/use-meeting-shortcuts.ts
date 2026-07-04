import { useEffect } from "react";

export const MEETING_SHORTCUTS = [
  { keys: ["M"], label: "Toggle mic" },
  { keys: ["V"], label: "Toggle camera" },
  { keys: ["S"], label: "Toggle screen share" },
  { keys: ["P"], label: "Toggle side panel" },
  { keys: ["?"], label: "Show shortcuts" },
] as const;

/**
 * Global keydown bindings for the meeting room. Ignored while typing in an
 * input/textarea/contenteditable so chat and notes stay untouched, and
 * ignored when a modifier key is held so browser/OS shortcuts still work.
 */
export function useMeetingShortcuts({
  enabled = true,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onTogglePanel,
  onShowShortcuts,
}: {
  enabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onTogglePanel?: () => void;
  onShowShortcuts?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case "m":
          onToggleMic?.();
          break;
        case "v":
          onToggleCamera?.();
          break;
        case "s":
          onToggleScreenShare?.();
          break;
        case "p":
          onTogglePanel?.();
          break;
        case "?":
          onShowShortcuts?.();
          break;
        default:
          return;
      }
      event.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onToggleMic, onToggleCamera, onToggleScreenShare, onTogglePanel, onShowShortcuts]);
}
