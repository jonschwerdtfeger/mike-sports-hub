import { formatNewsDate } from "@/lib/sports-format";
import type { TeamConfig } from "@/config/profile";
import type { PlayerPulse as PlayerPulseData, PlayerSignal, StarterHealth } from "@/lib/sports-data";

export function PlayerPulse({ pulse, team }: { pulse: PlayerPulseData; team: TeamConfig }) {
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

      {pulse.hotPlayers.length ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Hot Players</p>
          <div className="mt-2 grid gap-2">
            {pulse.hotPlayers.map((player) => (
              <div key={player.id}>
                <p className="text-sm font-semibold text-[var(--text)]">{player.value}</p>
                {player.detail ? <p className="mt-1 text-xs text-[var(--text-muted)]">{player.detail}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {pulse.starterHealth ? <StarterHealthRing health={pulse.starterHealth} team={team} /> : null}

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
            No major {team.shortName} roster signal found in public feed.
          </p>
        </div>
      )}
    </div>
  );
}

function StarterHealthRing({ health, team }: { health: StarterHealth; team: TeamConfig }) {
  const size = 78;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = health.percent ?? 0;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Starter Health</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-[78px] w-[78px] shrink-0">
          <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={team.primaryColor}
              strokeLinecap="round"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--text)]">
            {health.percent === null ? "--" : `${health.percent}%`}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{health.label}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{health.summary}</p>
          {health.impactText ? <p className="mt-1 text-xs text-[var(--text-soft)]">{health.impactText}</p> : null}
          {health.confidence !== "high" ? (
            <p className="mt-1 text-xs text-[var(--text-soft)]">Prototype starter list</p>
          ) : null}
        </div>
      </div>
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
