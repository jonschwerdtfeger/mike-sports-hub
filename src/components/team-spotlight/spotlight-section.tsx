export function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

export function SpotlightSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
