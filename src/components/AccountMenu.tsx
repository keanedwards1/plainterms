"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

type AccountMenuProps = {
  name: string;
  email: string;
  pictureUrl: string | null;
  plan?: "free" | "pro" | null;
};

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[18px] w-[18px] shrink-0 text-[var(--pt-muted)]",
  "aria-hidden": true,
};

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

const LINKS = [
  { href: "/documents", label: "Documents", icon: <svg {...ICON}><path d="M5 4h9l5 5v11H5z" /><path d="M14 4v5h5" /></svg> },
  { href: "/dashboard/billing", label: "Plan & billing", icon: <svg {...ICON}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></svg> },
  { href: "/dashboard/settings", label: "Account settings", icon: <svg {...ICON}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" /></svg> },
] as const;

function Avatar({ name, pictureUrl, size }: { name: string; pictureUrl: string | null; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-10 w-10 text-sm" : "h-7 w-7 text-[11px]";
  return pictureUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote avatar from the identity provider
    <img src={pictureUrl} alt="" width={40} height={40} className={`${box} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center rounded-full bg-[var(--pt-teal-deep)] font-bold text-white`}>
      {initials(name)}
    </span>
  );
}

/**
 * Account dropdown: a short list of links plus sign out, so it's built as a
 * disclosure popover users Tab through (not an arrow-key menu widget).
 */
export default function AccountMenu({ name, email, pictureUrl, plan = null }: AccountMenuProps) {
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
        className="flex items-center gap-2 rounded-full border border-[var(--pt-line)] bg-white p-1 pr-2.5 transition-colors hover:border-[color-mix(in_oklab,var(--pt-ink)_25%,var(--pt-line))]"
      >
        <Avatar name={name} pictureUrl={pictureUrl} size="sm" />
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 text-[var(--pt-muted)]">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={popoverRef} id={popoverId} popover="auto" className="pt-popover-menu">
        <div className="flex items-center gap-3 rounded-[10px] bg-[var(--pt-surface-soft)] px-3 py-3">
          <Avatar name={name} pictureUrl={pictureUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--pt-ink)]">{name}</p>
            {name !== email ? <p className="truncate text-xs text-[var(--pt-muted)]">{email}</p> : null}
          </div>
          {plan ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                plan === "pro" ? "bg-[var(--pt-ink)] text-white" : "bg-white text-[var(--pt-ink-soft)] ring-1 ring-[var(--pt-line)]"
              }`}
            >
              {plan === "pro" ? "Pro" : "Free"}
            </span>
          ) : null}
        </div>
        <nav aria-label="Account" className="mt-1.5 grid gap-0.5">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="pt-menu-item"
              onClick={() => popoverRef.current?.hidePopover()}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
        {plan === "free" ? (
          <Link
            href="/dashboard/billing"
            onClick={() => popoverRef.current?.hidePopover()}
            className="mt-1.5 flex items-center justify-between gap-3 rounded-[10px] bg-[#fbe3d2] px-3 py-2.5 text-sm transition-colors hover:bg-[#f8d6c0]"
          >
            <span>
              <span className="block font-semibold text-[var(--pt-ink)]">Upgrade to Pro</span>
              <span className="block text-xs text-[var(--pt-ink-soft)]">Our best model and revised drafts</span>
            </span>
            <svg {...ICON} className="h-4 w-4 shrink-0 text-[var(--pt-ink)]"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        ) : null}
        <form action="/sign-out" method="post" className="mt-1.5 border-t border-[var(--pt-line)] pt-1.5">
          <button type="submit" className="pt-menu-item text-[var(--pt-muted)]">
            <svg {...ICON}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></svg>
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
