"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const INPUT_SELECTOR = "input, textarea, [contenteditable='true']";

function isTypingElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return target.closest(INPUT_SELECTOR) !== null;
}

export interface KeyboardShortcutsCallbacks {
  onReply?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
  onNavigateDown?: () => void;
  onNavigateUp?: () => void;
  onSend?: () => void;
  onNewEmail?: () => void;
  onFocusSearch?: () => void;
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutsCallbacks): void {
  const router = useRouter();
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isTypingElement(event.target)) return;

    const cbs = callbacksRef.current;
    const isMac = typeof navigator !== "undefined" && navigator.platform?.toLowerCase().includes("mac");
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    switch (event.key) {
      case "r":
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          cbs.onReply?.();
        }
        break;
      case "e":
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          cbs.onArchive?.();
        }
        break;
      case "s":
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          cbs.onStar?.();
        }
        break;
      case "j":
      case "ArrowDown":
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          cbs.onNavigateDown?.();
        }
        break;
      case "k":
      case "ArrowUp":
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          cbs.onNavigateUp?.();
        }
        break;
      case "Enter":
        if (modifier) {
          event.preventDefault();
          cbs.onSend?.();
        }
        break;
      case "n":
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          if (cbs.onNewEmail) {
            cbs.onNewEmail();
          } else {
            router.push("/compose");
          }
        }
        break;
      case "/":
        event.preventDefault();
        cbs.onFocusSearch?.();
        break;
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);
}
