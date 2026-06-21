import { formatNewsDate } from "@/lib/sports-format";
import type { PlayerPulse as PlayerPulseData, PlayerSignal, RosterSnapshot } from "@/lib/sports-data";

export function PlayerPulse({ pulse, teamName }: { pulse: PlayerPulseData; teamName: string }) {
  const signals = [...pulse.availabilitySignals, ...pulse.personnelSignals];

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Team Leaders</p>
        {pulse.teamLeaders.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pulse.teamLeaders.map((leader) => (
              <div key={leader.id} className="rounded-md bg-[var(--surface-muted)] p-2">
                <p className="text-xs font-semibold text-[var(--text-soft)]">{leader.label}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">{leader.playerName}</p>
                <p className="text-xs text-[var(--text-muted)]">{leader.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">Team leader data is not available in the public feed.</p>
        )}
      </div>

      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Hot Players</p>
        {pulse.hotPlayers.length ? (
          <div className="mt-2 grid gap-2">
            {pulse.hotPlayers.map((player) => (
              <div key={player.id}>
                <p className="text-sm font-semibold text-[var(--text)]">{player.value}</p>
                {player.detail ? <p className="mt-1 text-xs text-[var(--text-muted)]">{player.detail}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">
            Recent player trend tracking will appear when enough game data is available.
          </p>
        )}
      </div>

      <RosterSnapshotCard snapshot={pulse.rosterSnapshot} />

      {signals.length ? (
        <div className="grid gap-2">
          {signals.map((signal) => (
            <PlayerSignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Roster Signal</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">
            No major {teamName} roster signal found in public feed.
          </p>
        </div>
      )}
    </div>
  );
}

function RosterSnapshotCard({ snapshot }: { snapshot: RosterSnapshot | undefined }) {
  const detail = snapshot
    ? [
        snapshot.activePlayers !== undefined ? `${snapshot.activePlayers} active` : undefined,
        snapshot.injuredPlayers !== undefined ? `${snapshot.injuredPlayers} flagged` : undefined,
        snapshot.largestPositionGroup
          ? `Largest group: ${snapshot.largestPositionGroup.name} (${snapshot.largestPositionGroup.count})`
          : undefined,
      ].filter(Boolean).join(" - ")
    : undefined;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Roster Snapshot</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">
        {snapshot ? `${snapshot.totalPlayers} players listed` : "Roster snapshot is not available in the public feed."}
      </p>
      {detail ? <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p> : null}
    </div>
  );
}

function PlayerSignalCard({ signal }: { signal: PlayerSignal }) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{signal.label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{signal.title}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {[signal.source, signal.publishedAt ? formatNewsDate(signal.publishedAt) : undefined].filter(Boolean).join(" - ")}
      </p>
    </>
  );

  if (!signal.url) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        {content}
      </div>
    );
  }

  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:bg-[var(--hover)]"
    >
      {content}
    </a>
  );
}
