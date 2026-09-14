"use client";

import { useEffect, useId, useRef, useState } from "react";

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
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

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const fieldClass =
  "w-full rounded border bg-elevated px-3 py-2.5 pr-11 text-sm text-fg placeholder:text-muted/70 focus:outline-none";

/**
 * Saved value is read-only until the pencil unlocks the field.
 * Check locks it again; the section Save button still persists to the DB.
 */
export function EditableField({
  label,
  value,
  onChange,
  lockVersion = 0,
  multiline = false,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  lockVersion?: number;
  multiline?: boolean;
  rows?: number;
}) {
  const reactId = useId();
  const id = `${label.toLowerCase().replace(/\s+/g, "-")}-${reactId}`;
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditing(false);
  }, [lockVersion]);

  useEffect(() => {
    if (!editing) return;
    const node = multiline ? areaRef.current : inputRef.current;
    node?.focus();
    try {
      node?.setSelectionRange(node.value.length, node.value.length);
    } catch {
      /* some inputs do not support selection range */
    }
  }, [editing, multiline]);

  const border = editing ? "border-accent" : "border-border";
  const actionLabel = editing ? `Done editing ${label}` : `Edit ${label}`;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative mt-2">
        {multiline ? (
          <textarea
            ref={areaRef}
            id={id}
            rows={rows}
            readOnly={!editing}
            value={value}
            placeholder="Not set"
            onChange={(e) => onChange(e.target.value)}
            className={`${fieldClass} ${border} ${editing ? "" : "cursor-default"}`}
          />
        ) : (
          <input
            ref={inputRef}
            id={id}
            readOnly={!editing}
            value={value}
            placeholder="Not set"
            onChange={(e) => onChange(e.target.value)}
            className={`${fieldClass} ${border} ${editing ? "" : "cursor-default"}`}
          />
        )}
        <button
          type="button"
          aria-label={actionLabel}
          title={actionLabel}
          onClick={() => setEditing((open) => !open)}
          className={`absolute right-1.5 text-muted hover:text-fg ${
            multiline ? "top-2.5" : "top-1/2 -translate-y-1/2"
          } rounded p-1.5`}
        >
          {editing ? <CheckIcon /> : <PencilIcon />}
        </button>
      </div>
    </div>
  );
}
