"use client";

import { Fragment, useEffect, useRef } from "react";
import { splitTerms } from "@/lib/glossary";

/** Renders text with every legal term underlined; hovering or focusing one shows its meaning. */
export function G({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <>
      {splitTerms(children).map((seg, i) =>
        typeof seg === "string" ? (
          <Fragment key={i}>{seg}</Fragment>
        ) : (
          <span key={i} className="rv-term" tabIndex={0} data-term={seg.term} data-def={seg.definition}>
            {seg.term}
          </span>
        )
      )}
    </>
  );
}

/**
 * One floating tooltip for the whole page. Shows a term's meaning, or the
 * reason for a tracked change ([data-tip]).
 */
export function GlossTooltip() {
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tip = tipRef.current;
    if (!tip) return undefined;
    let current: HTMLElement | null = null;

    const target = (e: Event) => (e.target instanceof Element ? (e.target.closest(".rv-term,[data-tip]") as HTMLElement | null) : null);

    function show(el: HTMLElement) {
      if (!tip) return;
      current = el;
      tip.replaceChildren();
      if (el.dataset.def) {
        const b = document.createElement("b");
        b.textContent = el.dataset.term ?? el.textContent ?? "";
        tip.append(b, document.createTextNode(el.dataset.def));
      } else {
        tip.textContent = el.dataset.tip ?? "";
      }
      el.setAttribute("aria-describedby", "rv-tip");
      tip.dataset.on = "true";
      const r = el.getBoundingClientRect();
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
      let y = r.top - h - 8;
      if (y < 8) y = r.bottom + 8;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
    }
    function hide() {
      current?.removeAttribute("aria-describedby");
      current = null;
      if (tip) tip.dataset.on = "false";
    }

    const over = (e: PointerEvent) => {
      const el = target(e);
      if (el) show(el);
    };
    const out = (e: PointerEvent) => {
      const el = target(e);
      if (el && !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) hide();
    };
    const focusIn = (e: FocusEvent) => {
      const el = target(e);
      if (el) show(el);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };

    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", key);
    // Scrolling keeps the tooltip on its term (focusing a term can scroll the page).
    const follow = () => {
      if (current) show(current);
    };
    window.addEventListener("scroll", follow, { passive: true, capture: true });
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", follow, { capture: true });
    };
  }, []);

  return <div ref={tipRef} id="rv-tip" role="tooltip" className="rv-tip" data-on="false" />;
}
