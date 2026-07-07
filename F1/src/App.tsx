import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const URL = "http://localhost:3000/research";

type Status = "include" | "exclude" | "discussion" | "undecided";
type Filter = "all" | Status;

interface Study {
  id: number;
  title: string;
  authors: string;
  year: number;
  abstract: string;
  status: Status;
}

const META: Record<Status, { label: string; key: string; pill: string; solid: string; tick: string }> = {
  include:    { label: "Include",   key: "i", pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", solid: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600", tick: "bg-emerald-500" },
  exclude:    { label: "Exclude",   key: "e", pill: "bg-rose-50 text-rose-700 ring-rose-600/20",          solid: "bg-rose-600 text-white hover:bg-rose-700 border-rose-600",          tick: "bg-rose-500" },
  discussion: { label: "Discuss",   key: "d", pill: "bg-amber-50 text-amber-700 ring-amber-600/20",       solid: "bg-amber-500 text-white hover:bg-amber-600 border-amber-500",       tick: "bg-amber-400" },
  undecided:  { label: "Undecided", key: "u", pill: "bg-slate-100 text-slate-500 ring-slate-500/15",      solid: "bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300",   tick: "bg-slate-300" },
};

const ORDER: Status[] = ["include", "exclude", "discussion", "undecided"];
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "undecided", label: "Undecided" },
  { value: "include", label: "Included" },
  { value: "exclude", label: "Excluded" },
  { value: "discussion", label: "Discuss" },
];

export default function App() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");

  const cards = useRef(new Map<number, HTMLElement>());
  const listRef = useRef<HTMLUListElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await axios.get<Study[]>(URL);
      // json-server stores ids as strings once written; keep them numeric.
      setStudies(data.map((s) => ({ ...s, id: Number(s.id) })));
    } catch {
      setLoadError("Couldn't reach the study server. Run npm run server, then retry.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? studies : studies.filter((s) => s.status === filter)),
    [studies, filter]
  );
  const counts = useMemo(() => {
    const c = { include: 0, exclude: 0, discussion: 0, undecided: 0 } as Record<Status, number>;
    studies.forEach((s) => c[s.status]++);
    return c;
  }, [studies]);
  const decided = studies.length - counts.undecided;

  // Keep a valid selection as the data or filter changes.
  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === selectedId)) setSelectedId(visible[0].id);
  }, [visible, selectedId]);

  // Follow the selection with focus while the reviewer is working in the list.
  useEffect(() => {
    if (selectedId == null) return;
    const el = cards.current.get(selectedId);
    if (el && listRef.current?.contains(document.activeElement)) {
      el.scrollIntoView({ block: "nearest" });
      el.focus({ preventScroll: true });
    }
  }, [selectedId]);

  const decide = useCallback(
    async (id: number, status: Status) => {
      const target = studies.find((s) => s.id === id);
      if (!target || target.status === status) return;
      const previous = studies;

      setStudies((cur) => cur.map((s) => (s.id === id ? { ...s, status } : s)));
      setAnnounce(`${META[status].label}: ${target.title}`);
      setSaveError("");

      // In a filtered view the decided study leaves the list — advance to the next.
      if (filter !== "all" && status !== filter) {
        const i = visible.findIndex((s) => s.id === id);
        const next = visible[i + 1] ?? visible[i - 1];
        if (next) setSelectedId(next.id);
      }

      try {
        await axios.patch(`${URL}/${id}`, { status });
      } catch {
        setStudies(previous);
        setSaveError("That decision didn't save. Check the server and try again.");
      }
    },
    [studies, visible, filter]
  );

  // Global keys: navigate and decide from anywhere; the first key enters the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!visible.length || selectedId == null) return;

      const inList = !!listRef.current?.contains(document.activeElement);
      const enter = () => cards.current.get(selectedId)?.focus({ preventScroll: true });
      const at = visible.findIndex((s) => s.id === selectedId);
      const go = (i: number) => setSelectedId(visible[Math.max(0, Math.min(visible.length - 1, i))].id);

      switch (e.key) {
        case "ArrowDown": case "j": e.preventDefault(); inList ? go(at + 1) : enter(); break;
        case "ArrowUp":   case "k": e.preventDefault(); inList ? go(at - 1) : enter(); break;
        case "Home": e.preventDefault(); inList ? go(0) : enter(); break;
        case "End":  e.preventDefault(); inList ? go(visible.length - 1) : enter(); break;
        default: {
          const status = ORDER.find((s) => META[s].key === e.key);
          if (status) { e.preventDefault(); decide(selectedId, status); if (!inList) enter(); }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selectedId, decide]);

  return (
    <div className="min-h-screen">
      <a href="#list" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to studies
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Title / Abstract screening</p>
              <h1 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">Study Review</h1>
            </div>
            <p className="text-right text-sm text-slate-500">
              <span className="text-lg font-semibold text-ink">{decided}</span>
              <span className="tabular-nums"> / {studies.length}</span>
              <br />
              <span className="text-xs">decided</span>
            </p>
          </div>
          {studies.length > 0 && (
            <div className="mt-3 flex gap-[3px]" aria-hidden="true">
              {studies.map((s) => (
                <span key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${META[s.status].tick}`} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter studies by decision">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                    active ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 tabular-nums ${active ? "text-white/70" : "text-slate-400"}`}>
                    {f.value === "all" ? studies.length : counts[f.value]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">↑↓ move · i / e / d / u decide</p>
        </div>

        {loading && <Note>Loading studies…</Note>}

        {!loading && loadError && (
          <Note tone="error">
            {loadError}
            <button onClick={load} className="ml-2 rounded-md bg-ink px-3 py-1 text-sm font-medium text-white hover:opacity-90">
              Retry
            </button>
          </Note>
        )}

        {!loading && !loadError && visible.length === 0 && <Note>No studies in this view. Try a different filter.</Note>}

        {!loading && !loadError && visible.length > 0 && (
          <ul id="list" ref={listRef} className="mt-4 space-y-4" aria-label="Research studies to screen">
            {visible.map((study, i) => (
              <Card
                key={study.id}
                study={study}
                position={`${i + 1} / ${visible.length}`}
                selected={study.id === selectedId}
                onSelect={() => setSelectedId(study.id)}
                onDecide={decide}
                registerRef={(el) => {
                  if (el) cards.current.set(study.id, el);
                  else cards.current.delete(study.id);
                }}
              />
            ))}
          </ul>
        )}
      </main>

      {saveError && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {saveError}
        </div>
      )}
      <div aria-live="polite" className="sr-only">{announce}</div>
    </div>
  );
}

function Card({
  study,
  position,
  selected,
  onSelect,
  onDecide,
  registerRef,
}: {
  study: Study;
  position: string;
  selected: boolean;
  onSelect: () => void;
  onDecide: (id: number, status: Status) => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const meta = META[study.status];
  return (
    <li>
      <article
        ref={registerRef}
        tabIndex={selected ? 0 : -1}
        aria-current={selected ? "true" : undefined}
        onFocus={onSelect}
        onClick={onSelect}
        className={`scroll-mt-40 rounded-2xl border bg-white p-5 transition-shadow focus:outline-none sm:p-6 ${
          selected ? "border-indigo-300 shadow-[0_0_0_3px_rgba(99,102,241,0.25)]" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium tabular-nums text-slate-400">{position}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.tick}`} />
            {meta.label}
          </span>
        </div>

        <h2 className="mt-2 font-serif text-xl font-semibold leading-snug text-ink sm:text-[1.6rem]">{study.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {study.authors} · <span className="tabular-nums">{study.year}</span>
        </p>
        <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-slate-700">{study.abstract}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {ORDER.map((status) => {
            const active = study.status === status;
            return (
              <button
                key={status}
                type="button"
                tabIndex={selected ? 0 : -1}
                aria-pressed={active}
                aria-label={`Mark "${study.title}" as ${META[status].label.toLowerCase()}`}
                onClick={(e) => { e.stopPropagation(); onDecide(study.id, status); }}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  active ? META[status].solid : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {META[status].label}
                <kbd className="ml-1.5 hidden font-sans text-[0.7rem] font-normal opacity-60 sm:inline">{META[status].key}</kbd>
              </button>
            );
          })}
        </div>
      </article>
    </li>
  );
}

function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) {
  return (
    <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>
      {children}
    </div>
  );
}
