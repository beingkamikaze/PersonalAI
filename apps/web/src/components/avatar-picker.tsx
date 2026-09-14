"use client";

import { useId, useRef } from "react";
import { UserAvatar } from "@/components/user-avatar";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
const MAX_BYTES = 2 * 1024 * 1024;

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function AvatarPicker({
  name,
  src,
  busy = false,
  onSelect,
  onRemove,
  onError,
  error,
}: {
  name: string;
  src?: string | null;
  busy?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  onError?: (message: string) => void;
  error?: string | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPhoto = Boolean(src);

  function openPicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  function onFile(file: File | null) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      onError?.("Photo too large (max 2 MB)");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const typeOk =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    if (!typeOk) {
      onError?.("Use a JPEG, PNG, WebP, or GIF image");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        Profile photo
      </label>
      <p className="mt-1 text-sm text-muted">
        JPEG, PNG, or WebP — max 2 MB. Optional.
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative shrink-0">
          <UserAvatar name={name} src={src} size="lg" />
          <button
            type="button"
            disabled={busy}
            aria-label={hasPhoto ? "Change profile photo" : "Add profile photo"}
            title={hasPhoto ? "Change photo" : "Add photo"}
            onClick={openPicker}
            className="absolute -bottom-0.5 -right-0.5 rounded-full border border-border bg-elevated p-1.5 text-muted hover:text-fg disabled:opacity-50"
          >
            <PencilIcon />
          </button>
        </div>
        <div className="min-w-0 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={openPicker}
            className="text-sm text-accent hover:text-accent-hover disabled:opacity-50"
          >
            {busy ? "Saving…" : hasPhoto ? "Change photo" : "Add photo"}
          </button>
          {hasPhoto && onRemove ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRemove}
              className="block text-sm text-muted hover:text-fg disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={busy}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
