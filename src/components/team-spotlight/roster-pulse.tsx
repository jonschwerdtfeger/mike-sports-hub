import type { RosterHighlight } from "@/lib/sports-data";

export function RosterPulse({ highlights }: { highlights: RosterHighlight[] }) {
  return (
    <div className="grid gap-2">
      {highlights.map((highlight) => (
        <div key={highlight.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{highlight.label}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">{highlight.value}</p>
          {highlight.detail ? <p className="mt-1 text-xs text-[var(--text-muted)]">{highlight.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
