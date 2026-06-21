import Image from "next/image";
import { GameStack } from "@/components/team-spotlight/game-stack";
import { PlayerPulse } from "@/components/team-spotlight/player-pulse";
import { SignalList } from "@/components/team-spotlight/signal-list";
import { PulseMetric, SpotlightSection } from "@/components/team-spotlight/spotlight-section";
import { StandingsTabs } from "@/components/team-spotlight/standings-tabs";
import { formatGameTitle } from "@/lib/sports-format";
import type { TeamSpotlight } from "@/lib/sports-data";

export function TeamSpotlightPanel({
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
          <StandingsTabs key={spotlight.team.id} standings={spotlight.standings} />
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

        <SpotlightSection eyebrow="Players and wire" title="Player Pulse">
          <PlayerPulse pulse={spotlight.playerPulse} team={spotlight.team} />
        </SpotlightSection>

        <SpotlightSection eyebrow="News and transactions" title="Latest Signals">
          <SignalList news={spotlight.news} transactions={spotlight.transactions} teamName={spotlight.team.shortName} />
        </SpotlightSection>
      </div>
    </div>
  );
}
