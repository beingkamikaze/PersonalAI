"use client";

import { Button } from "@/components/ui/button";

export function UnsavedChangesDialog({
  open,
  detail,
  onStay,
  onLeave,
}: {
  open: boolean;
  detail: string;
  onStay: () => void;
  onLeave: () => void;
}) {
  if (!open) return null;

  return (
    <div
      data-leave-guard-dialog
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="presentation"
      onClick={onStay}
    >
      <div className="absolute inset-0 bg-fg opacity-40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        className="relative w-full max-w-md rounded-lg border border-border bg-elevated p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unsaved-title" className="font-display text-xl text-fg">
          Save before leaving
        </h2>
        <p className="mt-3 text-sm text-muted">{detail}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" autoFocus onClick={onStay}>
            Stay and save
          </Button>
          <Button type="button" variant="ghost" onClick={onLeave}>
            Leave without saving
          </Button>
        </div>
      </div>
    </div>
  );
}
