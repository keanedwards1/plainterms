"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

type AccountMenuProps = {
  name: string;
  email: string;
  pictureUrl: string | null;
};

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

const LINKS = [
  { href: "/dashboard", label: "Documents" },
  { href: "/dashboard/billing", label: "Plan & billing" },
  { href: "/dashboard/settings", label: "Account settings" },
] as const;

/**
 * Account dropdown: a short list of links plus sign out, so it's built as a
 * disclosure popover users Tab through (not an arrow-key menu widget).
 */
export default function AccountMenu({ name, email, pictureUrl }: AccountMenuProps) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep aria-expanded in sync, and position from script where CSS anchor
  // positioning isn't available (otherwise the popover would centre itself).
  useEffect(() => {
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return undefined;
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === "open";
      trigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen && !CSS.supports("position-area", "block-end")) {
        const rect = trigger.getBoundingClientRect();
        popover.style.top = `${rect.bottom + 8}px`;
        popover.style.right = `${Math.max(window.innerWidth - rect.right, 8)}px`;
      }
    };
    popover.addEventListener("toggle", onToggle);
    return () => popover.removeEventListener("toggle", onToggle);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={popoverId}
        aria-expanded="false"
        aria-label={`Account: ${name}`}
        className="flex h-9 items-center gap-2 rounded-(--pt-radius-control) border-[1.5px] border-(--pt-ink) bg-white p-0.5 pr-2 transition-colors hover:bg-(--pt-surface-soft)"
      >
        {pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar from the identity provider
          <img src={pictureUrl} alt="" width={28} height={28} className="h-7 w-7 object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center bg-(--pt-ink) text-[11px] font-bold text-white"
          >
            {initials(name)}
          </span>
        )}
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 text-[var(--pt-muted)]">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={popoverRef} id={popoverId} popover="auto" className="pt-popover-menu">
        <div className="border-b border-[var(--pt-line)] px-3 pb-3 pt-2">
          <p className="truncate text-sm font-semibold text-[var(--pt-ink)]">{name}</p>
          {name !== email ? <p className="truncate text-xs text-[var(--pt-muted)]">{email}</p> : null}
        </div>
        <nav aria-label="Account" className="py-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="pt-menu-item"
              onClick={() => popoverRef.current?.hidePopover()}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/sign-out" method="post" className="border-t border-[var(--pt-line)] pt-1">
          <button type="submit" className="pt-menu-item text-[var(--pt-muted)]">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
