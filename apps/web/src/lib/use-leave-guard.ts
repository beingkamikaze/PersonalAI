"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Blocks in-app navigation (links, Sign out) and tab close while `enabled`.
 * Shows a custom dialog for same-origin clicks; the browser dialog for refresh/close.
 */
export function useLeaveGuard(enabled: boolean) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const bypassRef = useRef(false);
  const pendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!enabled || bypassRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      if (!enabled || bypassRef.current) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      if (e.target.closest("[data-leave-guard-dialog]")) return;

      const leaveBtn = e.target.closest<HTMLElement>("[data-unsaved-leave]");
      if (leaveBtn) {
        e.preventDefault();
        e.stopPropagation();
        pendingRef.current = () => {
          bypassRef.current = true;
          leaveBtn.click();
          window.setTimeout(() => {
            bypassRef.current = false;
          }, 0);
        };
        setOpen(true);
        return;
      }

      const anchor = e.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const href = `${url.pathname}${url.search}${url.hash}`;
      pendingRef.current = () => router.push(href);
      setOpen(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, router]);

  function stay() {
    pendingRef.current = null;
    setOpen(false);
  }

  function leaveWithoutSaving() {
    const run = pendingRef.current;
    pendingRef.current = null;
    setOpen(false);
    run?.();
  }

  return { open, stay, leaveWithoutSaving };
}
