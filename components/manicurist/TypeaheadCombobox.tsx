"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";

export type TypeaheadOption = {
  id: string;
  label: string;
  hint?: string;
};

/**
 * Free-text combobox: lets the user pick from a list OR type a brand new
 * value. Emits `{ kind: "existing", id }` on selection or `{ kind: "new",
 * name }` for typed input that doesn't match any option.
 */
export type TypeaheadValue =
  | { kind: "existing"; id: string; label: string }
  | { kind: "new"; name: string }
  | null;

export function TypeaheadCombobox({
  options,
  value,
  onChange,
  placeholder,
  emptyHint = "No matches — will be created",
  allowCreate = true,
  inputId,
}: {
  options: TypeaheadOption[];
  value: TypeaheadValue;
  onChange: (v: TypeaheadValue) => void;
  placeholder?: string;
  emptyHint?: string;
  allowCreate?: boolean;
  inputId?: string;
}) {
  const [query, setQuery] = React.useState<string>(() =>
    value?.kind === "existing"
      ? value.label
      : value?.kind === "new"
        ? value.name
        : "",
  );
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Reflect external value changes (e.g. parent reset on dialog close).
  React.useEffect(() => {
    setQuery(
      value?.kind === "existing"
        ? value.label
        : value?.kind === "new"
          ? value.name
          : "",
    );
  }, [value]);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const trimmed = query.trim();
  const lowered = trimmed.toLowerCase();
  const filtered = React.useMemo(() => {
    if (!lowered) return options.slice(0, 20);
    return options
      .filter((o) => o.label.toLowerCase().includes(lowered))
      .slice(0, 20);
  }, [options, lowered]);

  const exactMatch = filtered.find(
    (o) => o.label.toLowerCase() === lowered,
  );

  const showCreate = allowCreate && trimmed.length > 0 && !exactMatch;
  const totalItems = filtered.length + (showCreate ? 1 : 0);

  React.useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, totalItems - 1)));
  }, [totalItems]);

  function commit(index: number) {
    if (index < filtered.length) {
      const opt = filtered[index];
      onChange({ kind: "existing", id: opt.id, label: opt.label });
      setQuery(opt.label);
    } else if (showCreate) {
      onChange({ kind: "new", name: trimmed });
      setQuery(trimmed);
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, totalItems - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && totalItems > 0) {
        e.preventDefault();
        commit(highlight);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          id={inputId}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            // Editing detaches the previous selection. Re-resolve on blur /
            // selection.
            if (next.trim().length === 0) {
              onChange(null);
            } else {
              onChange({ kind: "new", name: next.trim() });
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-[#5C2D48]/60"
          aria-hidden
        />
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-[#F8BBD0] bg-white shadow-md">
          <ul className="py-1 text-sm">
            {filtered.map((o, i) => {
              const selected =
                value?.kind === "existing" && value.id === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commit(i)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                      i === highlight ? "bg-[#FFF5F8]" : ""
                    }`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[#3D1A2A]">
                        {o.label}
                      </span>
                      {o.hint && (
                        <span className="truncate text-[11px] text-[#5C2D48]/60">
                          {o.hint}
                        </span>
                      )}
                    </span>
                    {selected && (
                      <Check className="size-4 shrink-0 text-[#BE185D]" />
                    )}
                  </button>
                </li>
              );
            })}
            {showCreate && (
              <li>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(filtered.length)}
                  onClick={() => commit(filtered.length)}
                  className={`flex w-full items-center gap-2 border-t border-[#F8BBD0]/60 px-3 py-2 text-left transition-colors ${
                    highlight === filtered.length ? "bg-[#FFF5F8]" : ""
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[#3D1A2A]">
                      Use &ldquo;{trimmed}&rdquo;
                    </span>
                    <span className="truncate text-[11px] text-[#5C2D48]/60">
                      {emptyHint}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
