"use client";

import "./search.css";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { highlight, searchDocuments, type SearchHit, type Segment } from "@/lib/documentSearch";
import { loadDocumentIndex, peekDocumentIndex } from "@/lib/documentSearchIndex";
import LogoLoader from "@/components/LogoLoader";

const RECENT_KEY = "pt.recentSearches";
const WHERE: Record<SearchHit["where"], string> = {
  title: "",
  parties: "Parties",
  file: "File name",
  review: "In the review",
  contract: "In the contract",
};

function readRecent(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const q = query.trim();
  if (!q) return;
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Recent searches just aren't remembered.
  }
}

function Marked({ parts }: { parts: Segment[] }) {
  return (
    <>
      {parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function SearchIcon({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </svg>
  );
}

/**
 * The top bar's document search: a button that opens an instant results panel.
 * ⌘K / Ctrl+K or "/" opens it from anywhere; arrows move, Enter opens, Esc closes.
 */
export default function SearchPanel() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(() => Boolean(peekDocumentIndex()));
  const [failed, setFailed] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const deferred = useDeferredValue(query);
  const listId = useId();

  const show = useCallback(() => {
    setOpen(true);
    setRecent(readRecent());
    setFailed(false);
    loadDocumentIndex()
      .then(() => setReady(true))
      .catch(() => setFailed(true));
  }, []);

  // Warm the index once the page is idle, so the first search usually opens with results ready.
  useEffect(() => {
    if (peekDocumentIndex()) return undefined;
    const warm = () => {
      loadDocumentIndex()
        .then(() => setReady(true))
        .catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);

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
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const cache = ready ? peekDocumentIndex() : null;
  const outcome = useMemo(() => (cache && deferred.trim() ? searchDocuments(cache.index, deferred) : null), [cache, deferred]);
  const recentDocs = useMemo(
    () => (cache ? [...cache.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5) : []),
    [cache]
  );

  const options: Array<{ id: string; href: string; query?: string }> = outcome
    ? outcome.hits.map((h) => ({ id: h.record.id, href: `/result/${encodeURIComponent(h.record.id)}` }))
    : [
        ...recent.map((q) => ({ id: `q:${q}`, href: "", query: q })),
        ...recentDocs.map((r) => ({ id: r.id, href: `/result/${encodeURIComponent(r.id)}` })),
      ];
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  function go(option: { href: string; query?: string } | undefined) {
    if (!option) return;
    if (option.query) {
      setQuery(option.query);
      setActive(0);
      inputRef.current?.focus();
      return;
    }
    saveRecent(query);
    close();
    router.push(option.href);
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
  const hits = outcome?.hits ?? [];
  const topCount = hits.length > 4 ? 3 : 0;

  const renderHit = (hit: SearchHit, i: number) => (
    <li
      key={hit.record.id}
      id={optionId(i)}
      role="option"
      aria-selected={i === activeIndex}
      className="pt-sr-hit"
      onMouseMove={() => setActive(i)}
      onClick={() => go(options[i])}
    >
      <p className="pt-sr-title">
        <Marked parts={hit.titleParts} />
      </p>
      <p className="pt-sr-meta">
        {[formatDate(hit.record.createdAt), hit.record.verdict].filter(Boolean).join(" · ")}
        {WHERE[hit.where] ? <span className="pt-sr-where">{WHERE[hit.where]}</span> : null}
      </p>
      {hit.snippet.length ? (
        <p className="pt-sr-snippet">
          <Marked parts={hit.snippet} />
        </p>
      ) : null}
    </li>
  );

  return (
    <div ref={wrapRef} className="pt-search-wrap" data-open={open}>
      <label className="pt-search">
        <span className="sr-only">Search your documents</span>
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
          onFocus={() => {
            if (!open) show();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) show();
          }}
          onKeyDown={onKeyDown}
          placeholder="Search your documents"
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
            {failed ? (
              <p className="pt-sr-empty">Your documents couldn&apos;t be searched right now. Try again in a moment.</p>
            ) : !cache ? (
              <div className="pt-sr-loading">
                <LogoLoader size={36} label="Getting your documents ready" />
                <p>Getting your documents ready…</p>
              </div>
            ) : outcome ? (
              <>
                {outcome.suggestion ? (
                  <p className="pt-sr-note">
                    Did you mean{" "}
                    <button
                      type="button"
                      className="pt-sr-suggest"
                      onClick={() => {
                        setQuery(outcome.suggestion ?? "");
                        setActive(0);
                        inputRef.current?.focus();
                      }}
                    >
                      {outcome.suggestion}
                    </button>
                    ?
                  </p>
                ) : null}
                {outcome.partial ? <p className="pt-sr-note">No document has every word. These match some of them.</p> : null}
                {hits.length ? (
                  <ul id={listId} role="listbox" aria-label="Results" className="pt-sr-list">
                    {topCount ? <li role="presentation" className="pt-sr-group">Top hits</li> : null}
                    {hits.slice(0, topCount).map((h, i) => renderHit(h, i))}
                    {topCount ? <li role="presentation" className="pt-sr-group">More results</li> : null}
                    {hits.slice(topCount).map((h, i) => renderHit(h, i + topCount))}
                  </ul>
                ) : (
                  <p className="pt-sr-empty">
                    No documents match &ldquo;{query.trim()}&rdquo;. Try fewer words, or check the spelling.
                  </p>
                )}
              </>
            ) : cache.records.length === 0 ? (
              <p className="pt-sr-empty">You haven&apos;t analyzed any documents yet.</p>
            ) : (
              <ul id={listId} role="listbox" aria-label="Suggestions" className="pt-sr-list">
                {recent.length ? <li role="presentation" className="pt-sr-group">Recent searches</li> : null}
                {recent.map((q, i) => (
                  <li
                    key={`q:${q}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    className="pt-sr-hit pt-sr-recent"
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(options[i])}
                  >
                    <SearchIcon className="h-4 w-4 shrink-0 text-(--pt-muted)" />
                    {q}
                  </li>
                ))}
                <li role="presentation" className="pt-sr-group">Recent documents</li>
                {recentDocs.map((r, j) => {
                  const i = recent.length + j;
                  const title = cache.index.titles.get(r.id) ?? r.fileName;
                  return (
                    <li
                      key={r.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === activeIndex}
                      className="pt-sr-hit"
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(options[i])}
                    >
                      <p className="pt-sr-title">
                        <Marked parts={highlight(title, [])} />
                      </p>
                      <p className="pt-sr-meta">{[formatDate(r.createdAt), r.verdict].filter(Boolean).join(" · ")}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="pt-sr-foot" aria-hidden="true">
            <span>↑↓ to move</span>
            <span>↵ to open</span>
            <span>&quot;quotes&quot; for an exact phrase</span>
          </p>
        </div>
      ) : null}
    </div>

  );
}
