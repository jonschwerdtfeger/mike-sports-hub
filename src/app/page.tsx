import { TeamSpotlightDock } from "@/components/team-spotlight-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { michaelProfile, TeamConfig } from "@/config/profile";
import { formatGameTitle, formatNewsDate } from "@/lib/sports-format";
import { GameSummary, getDashboardData, NewsItem, TeamSpotlight } from "@/lib/sports-data";

export default async function Home() {
  const data = await getDashboardData();
  const teamById = new Map(data.teams.map((team) => [team.id, team]));

  return (
    <main className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Personal sports desk
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-5xl">
                {michaelProfile.title}
              </h1>
            </div>
            <div className="flex justify-start lg:justify-end">
              <ThemeToggle />
            </div>
          </header>

          <TodayFocus
            liveGames={data.liveGames}
            upcomingGames={data.upcomingGames}
            spotlights={data.teamSpotlights}
            teams={teamById}
          />

          <TeamSpotlightDock spotlights={data.teamSpotlights} />
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:px-8">
        <section className="space-y-6">
          {data.liveGames.length > 0 ? (
            <DashboardSection title="Live Now" eyebrow="In progress">
              <div className="grid gap-3">
                {data.liveGames.map((game) => {
                  const team = teamById.get(game.teamId);
                  return (
                    <Scorebug key={game.id} game={game} team={team} variant="wide" />
                  );
                })}
              </div>
            </DashboardSection>
          ) : null}

          <DashboardSection title="Upcoming Watchlist" eyebrow="Scores and schedule">
            <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
              {data.upcomingGames.map((game) => {
                const team = teamById.get(game.teamId);
                return (
                  <GameRow key={game.id} game={game} team={team} />
                );
              })}
            </div>
          </DashboardSection>

          <DashboardSection title="Team Signals" eyebrow="Quick scan">
            <TeamSignalStrip spotlights={data.teamSpotlights} />
          </DashboardSection>
        </section>

        <aside className="space-y-6">
          <DashboardSection title="Top Headlines" eyebrow="News feed">
            <NewsList items={data.news.slice(0, 12)} teams={teamById} />
          </DashboardSection>

          <DashboardSection title="Roster Wire" eyebrow="Transactions and injuries">
            <NewsList items={data.transactions} teams={teamById} compact />
          </DashboardSection>
        </aside>
      </div>
    </main>
  );
}

function TodayFocus({
  liveGames,
  upcomingGames,
  spotlights,
  teams,
}: {
  liveGames: GameSummary[];
  upcomingGames: GameSummary[];
  spotlights: TeamSpotlight[];
  teams: Map<string, TeamConfig>;
}) {
  const recentResults = spotlights
    .map((spotlight) => spotlight.lastGames[0])
    .filter((game): game is GameSummary => Boolean(game))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const focusGames = liveGames.length ? liveGames : upcomingGames.length ? upcomingGames.slice(0, 4) : recentResults.slice(0, 4);
  const eyebrow = liveGames.length ? "Live priority" : upcomingGames.length ? "Next up" : "Recent form";
  const title = liveGames.length ? "Live Now" : upcomingGames.length ? "Today's Focus" : "Latest Results";

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{eyebrow}</p>
          <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
        </div>
        <span className="rounded-md bg-[var(--badge)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
          {focusGames.length} items
        </span>
      </div>
      <div className="grid gap-2 lg:grid-cols-4">
        {focusGames.map((game) => (
          <FocusTile key={game.id} game={game} team={teams.get(game.teamId)} mode={liveGames.length ? "live" : upcomingGames.length ? "next" : "result"} />
        ))}
      </div>
    </section>
  );
}

function FocusTile({ game, team, mode }: { game: GameSummary; team?: TeamConfig; mode: "live" | "next" | "result" }) {
  const badge = mode === "live" ? "Live" : mode === "next" ? game.shortDate : game.result ?? "Final";

  return (
    <article className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: team?.primaryColor ?? "var(--border-strong)" }}
          />
          <p className="truncate text-sm font-semibold text-[var(--text)]">{team?.shortName ?? "Team"}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black uppercase ${
          mode === "live" ? "bg-red-600 text-white" : "bg-[var(--badge)] text-[var(--text)]"
        }`}>
          {badge}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--text)]">{formatGameTitle(game)}</p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">{game.score ?? game.status}</p>
    </article>
  );
}

function Scorebug({
  game,
  team,
  variant = "compact",
}: {
  game: GameSummary;
  team?: TeamConfig;
  variant?: "compact" | "wide";
}) {
  const competitors = game.competitors;
  const away = competitors?.away;
  const home = competitors?.home;
  const selectedColor = team?.primaryColor ?? "var(--border-strong)";
  const statusText = game.periodLabel ?? game.status;
  const context = [game.outsText, game.clock && game.clock !== "0:00" ? game.clock : undefined]
    .filter(Boolean)
    .join(" - ");

  if (!away || !home) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <LiveBadge />
          <span className="text-sm font-semibold text-[var(--text-muted)]">{statusText}</span>
        </div>
        <p className="mt-3 text-lg font-semibold text-[var(--text)]">
          {team?.shortName ?? "Team"} {game.score ?? game.status}
        </p>
      </div>
    );
  }

  return (
    <article
      className={`overflow-hidden rounded-md ${
        variant === "wide"
          ? "border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5"
          : "bg-[var(--surface-muted)] p-3"
      }`}
    >
      <div
        aria-hidden="true"
        className="h-1 rounded-full"
        style={{ background: `linear-gradient(90deg, ${away.color ?? selectedColor}, ${home.color ?? selectedColor})` }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <LiveBadge />
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text)]">{statusText}</p>
          {context ? <p className="text-xs font-semibold text-[var(--text-soft)]">{context}</p> : null}
        </div>
      </div>

      <div className={`mt-4 grid items-center gap-3 ${variant === "wide" ? "sm:grid-cols-[1fr_auto_1fr]" : ""}`}>
        <ScorebugTeam competitor={away} align={variant === "wide" ? "right" : "left"} />
        <div className="hidden text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)] sm:block">
          at
        </div>
        <ScorebugTeam competitor={home} align="left" />
      </div>

      {game.bases ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <BaseDiamond bases={game.bases} />
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            Base state
          </span>
        </div>
      ) : null}
    </article>
  );
}

function ScorebugTeam({
  competitor,
  align,
}: {
  competitor: NonNullable<GameSummary["competitors"]>["home"];
  align: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "sm:justify-end" : ""}`}>
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: competitor.color ?? "var(--border-strong)" }}
      />
      <div className={align === "right" ? "sm:text-right" : ""}>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
          {competitor.homeAway}
        </p>
        <p className="text-base font-black text-[var(--text)]">{competitor.abbreviation}</p>
      </div>
      <div className="ml-auto min-w-12 rounded-md bg-[var(--surface-muted)] px-3 py-1 text-center text-2xl font-black text-[var(--text)] sm:ml-0">
        {competitor.score ?? "0"}
      </div>
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-red-600 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
      <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
      Live
    </span>
  );
}

function BaseDiamond({ bases }: { bases: NonNullable<GameSummary["bases"]> }) {
  return (
    <div className="relative h-10 w-10" aria-label="Base runners">
      <BaseMarker className="left-4 top-0" active={bases.second} label="Second base" />
      <BaseMarker className="right-0 top-4" active={bases.first} label="First base" />
      <BaseMarker className="left-0 top-4" active={bases.third} label="Third base" />
      <BaseMarker className="left-4 bottom-0" active={false} label="Home plate" />
    </div>
  );
}

function BaseMarker({ className, active, label }: { className: string; active: boolean; label: string }) {
  return (
    <span
      aria-label={label}
      className={`absolute h-3 w-3 rotate-45 border border-[var(--border-strong)] ${
        active ? "bg-red-500" : "bg-[var(--surface-muted)]"
      } ${className}`}
    />
  );
}

function TeamSignalStrip({ spotlights }: { spotlights: TeamSpotlight[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
      {spotlights.map((spotlight) => {
        const headline = spotlight.news[0] ?? spotlight.transactions[0];

        return (
          <div
            key={spotlight.team.id}
            className="grid gap-2 border-b border-[var(--border)] p-3 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: spotlight.team.primaryColor }}
              />
              <p className="text-sm font-semibold text-[var(--text)]">{spotlight.team.shortName}</p>
            </div>
            <p className="min-w-0 truncate text-sm font-medium text-[var(--text)]">
              {headline?.title ?? spotlight.status.statusLabel}
            </p>
            <span className="w-fit rounded-md bg-[var(--badge)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
              {spotlight.standing.record ?? spotlight.status.record}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--text)]">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function GameRow({ game, team }: { game: GameSummary; team?: TeamConfig }) {
  return (
    <div className="grid gap-2 border-b border-[var(--border)] p-4 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
      <div className="text-sm font-semibold text-[var(--text-muted)]">{game.shortDate}</div>
      <div>
        <p className="font-semibold text-[var(--text)]">
          {team?.shortName ?? "Team"} {game.homeAway === "away" ? "at" : "vs"} {game.opponent}
        </p>
        <p className="text-sm text-[var(--text-soft)]">{game.venue ?? game.status}</p>
      </div>
      <div className="w-fit rounded-md bg-[var(--badge)] px-3 py-1 text-sm font-medium text-[var(--text)]">
        {game.score ?? game.status}
      </div>
    </div>
  );
}

function NewsList({
  items,
  teams,
  compact = false,
}: {
  items: NewsItem[];
  teams: Map<string, TeamConfig>;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
      {items.map((item) => {
        const team = teams.get(item.teamId);
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block border-b border-[var(--border)] p-4 transition last:border-b-0 hover:bg-[var(--hover)]"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: team?.primaryColor ?? "var(--text-muted)" }}
              />
              {team?.shortName ?? "SportsHub"} - {item.source}
            </div>
            <p className={`${compact ? "mt-1 text-sm" : "mt-2 text-base"} font-semibold text-[var(--text)]`}>
              {item.title}
            </p>
            {!compact ? (
              <p className="mt-2 text-sm text-[var(--text-soft)]">{formatNewsDate(item.publishedAt)}</p>
            ) : null}
          </a>
        );
      })}
    </div>
  );
}
