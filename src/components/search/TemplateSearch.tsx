"use client";

import "./search.css";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { highlight } from "@/lib/documentSearch";
import { searchTemplates } from "@/lib/templateSearch";
import { HOME_TEMPLATES, type TemplateInfo } from "@/lib/templates";
import { Marked, SearchIcon } from "@/components/search/parts";

/**
 * The top bar's search on the templates page. It searches every template in the list, so new
 * templates show up here as soon as they're added. Same keys as the document search:
 * ⌘K / Ctrl+K or "/" to open, arrows to move, Enter to open, Esc to close.
 */
export default function TemplateSearch() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  // A click anywhere outside the field and its dropdown closes it.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // ⌘K / Ctrl+K anywhere, or "/" when not typing somewhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const outcome = useMemo(() => (deferred.trim() ? searchTemplates(deferred) : null), [deferred]);
  const options: TemplateInfo[] = outcome ? outcome.hits.map((h) => h.template) : HOME_TEMPLATES;
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  function go(template: TemplateInfo | undefined) {
    if (!template) return;
    close();
    if (template.href) {
      router.push(template.href);
      return;
    }
    // Not fillable yet: take them to its card on this page. A real hash change (not router.push), so the
    // browser scrolls to the card, :target marks it, and a filtered-out category opens again. Clearing
    // the hash first makes picking the same template twice still count as a change.
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`#${template.slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(options[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const optionId = (i: number) => `${listId}-o${i}`;

  const renderOption = (template: TemplateInfo, i: number) => {
    const nameParts = outcome?.hits[i]?.nameParts ?? highlight(template.name, []);
    return (
      <li
        key={template.slug}
        id={optionId(i)}
        role="option"
        aria-selected={i === activeIndex}
        className="pt-sr-hit"
        onMouseMove={() => setActive(i)}
        onClick={() => go(template)}
      >
        <p className="pt-sr-title">
          <Marked parts={nameParts} />
        </p>
        <p className="pt-sr-meta">
          {template.group}
          {template.href ? null : <span className="pt-sr-where">Opening soon</span>}
        </p>
        <p className="pt-sr-snippet">{template.line}</p>
      </li>
    );
  };

  return (
    <div ref={wrapRef} className="pt-search-wrap" data-open={open}>
      <label className="pt-search">
        <span className="sr-only">Search templates</span>
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options.length ? optionId(activeIndex) : undefined}
          aria-keyshortcuts="Meta+K Control+K /"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search templates"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="pt-search-kbd" aria-hidden="true">
          {open ? "esc" : "⌘K"}
        </kbd>
      </label>

      {open ? (
        <div className="pt-sr-drop">
          <div className="pt-sr-body">
            {outcome && !outcome.hits.length ? (
              <p className="pt-sr-empty">
                No templates match &ldquo;{query.trim()}&rdquo;. Try fewer words, or another name for it.
              </p>
            ) : (
              <>
                {outcome?.partial ? <p className="pt-sr-note">No template has every word. These match some of them.</p> : null}
                <ul id={listId} role="listbox" aria-label={outcome ? "Results" : "Popular templates"} className="pt-sr-list">
                  {outcome ? null : <li role="presentation" className="pt-sr-group">Popular templates</li>}
                  {options.map(renderOption)}
                </ul>
              </>
            )}
          </div>
          <p className="pt-sr-foot" aria-hidden="true">
            <span>↑↓ to move</span>
            <span>↵ to open</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
