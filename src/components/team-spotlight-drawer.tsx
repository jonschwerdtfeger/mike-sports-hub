"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameSummary, NewsItem, RosterHighlight, StandingsRow, TeamSpotlight } from "@/lib/sports-data";

type TeamSpotlightDockProps = {
  spotlights: TeamSpotlight[];
};

export function TeamSpotlightDock({ spotlights }: TeamSpotlightDockProps) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeSpotlight = spotlights.find((spotlight) => spotlight.team.id === activeTeamId);

  const closeDrawer = useCallback(() => {
    const teamId = activeTeamId;
    setActiveTeamId(null);
    window.setTimeout(() => {
      if (teamId) {
        buttonRefs.current[teamId]?.focus();
      }
    }, 0);
  }, [activeTeamId]);

  useEffect(() => {
    if (!activeSpotlight) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSpotlight, closeDrawer]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {spotlights.map((spotlight) => (
          <button
            key={spotlight.team.id}
            ref={(element) => {
              buttonRefs.current[spotlight.team.id] = element;
            }}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={activeTeamId === spotlight.team.id}
            onClick={() => setActiveTeamId(spotlight.team.id)}
            className="flex min-h-14 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-left font-medium text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-strong)]"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: spotlight.team.primaryColor }}
            />
            <span className="min-w-0 truncate">{spotlight.team.shortName}</span>
          </button>
        ))}
      </div>

      {activeSpotlight ? (
        <div
          className="fixed inset-0 z-50 bg-black/45"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDrawer();
            }
          }}
        >
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-spotlight-title"
            className="fixed inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:h-screen lg:max-h-none lg:w-[480px] lg:rounded-l-md lg:rounded-tr-none"
          >
            <TeamSpotlightPanel spotlight={activeSpotlight} closeButtonRef={closeButtonRef} onClose={closeDrawer} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function TeamSpotlightPanel({
  spotlight,
  closeButtonRef,
  onClose,
}: {
  spotlight: TeamSpotlight;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const featuredGame = spotlight.status.liveGame ?? spotlight.status.nextGame ?? spotlight.status.lastGame;

  return (
    <div>
      <div
        aria-hidden="true"
        className="h-1.5"
        style={{ background: `linear-gradient(90deg, ${spotlight.team.primaryColor}, ${spotlight.team.secondaryColor})` }}
      />
      <header className="border-b border-[var(--border)] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={spotlight.team.logoUrl}
              alt={`${spotlight.team.displayName} logo`}
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                {spotlight.team.league.replace("-", " ")}
              </p>
              <h2 id="team-spotlight-title" className="mt-1 truncate text-2xl font-semibold text-[var(--text)]">
                {spotlight.team.shortName}
              </h2>
              <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
                {spotlight.standing.label ?? spotlight.status.statusLabel}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close team spotlight"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] text-lg font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
          >
            X
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <PulseMetric label="Record" value={spotlight.standing.record ?? spotlight.status.record} />
          <PulseMetric label="Standing" value={spotlight.standing.standing ?? "Feed pending"} />
          <PulseMetric label="Status" value={spotlight.status.statusLabel} />
          <PulseMetric label="Next" value={spotlight.status.nextGame ? formatGameTitle(spotlight.status.nextGame) : "Schedule pending"} />
        </div>

        {featuredGame ? (
          <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              {featuredGame.state === "in" ? "Live now" : spotlight.status.nextGame ? "Next up" : "Latest result"}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formatGameTitle(featuredGame)}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{featuredGame.score ?? featuredGame.status}</p>
          </div>
        ) : null}
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <SpotlightSection eyebrow="League context" title="Standings">
          <StandingsList rows={spotlight.standingsRows} />
        </SpotlightSection>

        <SpotlightSection eyebrow="Form and schedule" title="Last 5 / Next 5">
          <div className="grid gap-3 sm:grid-cols-2">
            <GameStack
              title="Last 5"
              games={spotlight.lastGames}
              emptyText="No recent final games in feed."
              variant="result"
            />
            <GameStack
              title="Next 5"
              games={spotlight.nextGames}
              emptyText="No upcoming games in feed."
              variant="status"
            />
          </div>
        </SpotlightSection>

        <SpotlightSection eyebrow="Players and wire" title="Roster Pulse">
          <RosterPulse highlights={spotlight.rosterHighlights} />
        </SpotlightSection>

        <SpotlightSection eyebrow="News and transactions" title="Latest Signals">
          <SignalList news={spotlight.news} transactions={spotlight.transactions} />
        </SpotlightSection>
      </div>
    </div>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function SpotlightSection({
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

function StandingsList({ rows }: { rows: StandingsRow[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)]">
      {rows.map((row) => (
        <div
          key={row.id}
          className={`grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 border-b border-[var(--border)] p-3 text-sm last:border-b-0 ${
            row.isSelected ? "bg-[var(--surface-muted)]" : "bg-[var(--surface)]"
          }`}
        >
          <div className="font-semibold text-[var(--text-muted)]">{row.rank ?? "-"}</div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--text)]">{row.teamName}</p>
            <p className="text-xs text-[var(--text-soft)]">{row.detail ?? row.streak ?? "Standing detail pending"}</p>
          </div>
          <div className="text-right font-semibold text-[var(--text)]">{row.record ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}

function GameStack({
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

function RosterPulse({ highlights }: { highlights: RosterHighlight[] }) {
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

function SignalList({ news, transactions }: { news: NewsItem[]; transactions: NewsItem[] }) {
  const items = [...transactions, ...news].slice(0, 5);

  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
      {items.map((item) => (
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
      ))}
    </div>
  );
}

function formatGameTitle(game: GameSummary) {
  const location = game.homeAway === "away" ? "at" : game.homeAway === "home" ? "vs" : "vs";
  return `${location} ${game.opponent}`;
}

function formatNewsDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
