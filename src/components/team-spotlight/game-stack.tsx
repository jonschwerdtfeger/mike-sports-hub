import { formatGameTitle } from "@/lib/sports-format";
import type { GameSummary } from "@/lib/sports-data";

export function GameStack({
  title,
  games,
  emptyText,
  variant,
}: {
  title: string;
  games: GameSummary[];
  emptyText: string;
  variant: "result" | "status";
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
        {title}
      </div>
      {games.length ? (
        games.map((game) => <MiniGameRow key={game.id} game={game} variant={variant} />)
      ) : (
        <p className="p-3 text-sm text-[var(--text-muted)]">{emptyText}</p>
      )}
    </div>
  );
}

function MiniGameRow({ game, variant }: { game: GameSummary; variant: "result" | "status" }) {
  return (
    <div className="border-b border-[var(--border)] p-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">{formatGameTitle(game)}</p>
        {variant === "result" ? <ResultBadge game={game} /> : <StatusBadge label={game.score ?? game.status} />}
      </div>
      <p className="mt-1 text-xs text-[var(--text-soft)]">{game.shortDate}</p>
    </div>
  );
}

function ResultBadge({ game }: { game: GameSummary }) {
  if (!game.result || !game.teamScore || !game.opponentScore) {
    return <StatusBadge label={game.score ?? game.status} />;
  }

  const resultStyles = {
    W: "bg-green-600 text-white",
    L: "bg-red-600 text-white",
    T: "bg-[var(--badge)] text-[var(--text)]",
  }[game.result];

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${resultStyles}`}>
        {game.result}
      </span>
      <span className="rounded-md bg-[var(--badge)] px-2 py-1 text-xs font-semibold text-[var(--text)]">
        {game.teamScore}-{game.opponentScore}
      </span>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-md bg-[var(--badge)] px-2 py-1 text-xs font-semibold text-[var(--text)]">
      {label}
    </span>
  );
}
