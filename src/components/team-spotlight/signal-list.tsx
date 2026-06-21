import { formatNewsDate } from "@/lib/sports-format";
import type { NewsItem } from "@/lib/sports-data";

export function SignalList({
  news,
  transactions,
  teamName = "team",
}: {
  news: NewsItem[];
  transactions: NewsItem[];
  teamName?: string;
}) {
  const items = [...transactions, ...news].slice(0, 5);

  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
      {items.length ? (
        items.map((item) => (
          <a
            key={`${item.category}-${item.id}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block border-b border-[var(--border)] p-3 transition last:border-b-0 hover:bg-[var(--hover)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              {item.category === "transaction" ? "Roster wire" : item.source}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--text-soft)]">{formatNewsDate(item.publishedAt)}</p>
          </a>
        ))
      ) : (
        <div className="p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            Latest Signals
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">
            No major {teamName} news signal found in public feed.
          </p>
        </div>
      )}
    </div>
  );
}
