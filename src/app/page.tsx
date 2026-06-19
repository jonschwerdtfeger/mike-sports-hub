import Image from "next/image";
import { TeamSpotlightDock } from "@/components/team-spotlight-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { michaelProfile, TeamConfig } from "@/config/profile";
import { GameSummary, getDashboardData, NewsItem, TeamStandingSummary, TeamStatus } from "@/lib/sports-data";

export default async function Home() {
  const data = await getDashboardData();
  const statusByTeam = new Map(data.statuses.map((status) => [status.teamId, status]));
  const standingByTeam = new Map(data.standings.map((standing) => [standing.teamId, standing]));
  const teamById = new Map(data.teams.map((team) => [team.id, team]));

  return (
    <main className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Personal sports desk
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-5xl">
                {michaelProfile.title}
              </h1>
            </div>
            <div className="flex flex-col gap-3 lg:min-w-[620px]">
              <div className="flex justify-start lg:justify-end">
                <ThemeToggle />
              </div>
              <TeamSpotlightDock spotlights={data.teamSpotlights} />
            </div>
          </header>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                status={statusByTeam.get(team.id)}
                standing={standingByTeam.get(team.id)}
              />
            ))}
          </div>
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

          <DashboardSection title="Team Rooms" eyebrow="Michael's teams">
            <div className="grid gap-3 md:grid-cols-2">
              {data.teams.map((team) => (
                <TeamRoom
                  key={team.id}
                  team={team}
                  status={statusByTeam.get(team.id)}
                  news={data.news.filter((item) => item.teamId === team.id).slice(0, 2)}
                />
              ))}
            </div>
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

function TeamCard({
  team,
  status,
  standing,
}: {
  team: TeamConfig;
  status?: TeamStatus;
  standing?: TeamStandingSummary;
}) {
  const featuredGame = status?.liveGame ?? status?.nextGame ?? status?.lastGame;

  return (
    <article
      id={team.id}
      className="relative min-h-64 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: team.primaryColor }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {team.league.replace("-", " ")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
            {team.displayName}
            {standing?.label ? (
              <span className="ml-1 text-sm font-medium text-[var(--text-muted)]">
                ({standing.label})
              </span>
            ) : null}
          </h2>
        </div>
        <Image
          src={team.logoUrl}
          alt={`${team.displayName} logo`}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 object-contain"
        />
      </div>

      <div className="mt-6 grid gap-3">
        <Metric label="Status" value={status?.statusLabel ?? "Loading public feed"} />
        <Metric label="Record" value={status?.record ?? "Public feed pending"} />
      </div>

      {featuredGame?.state === "in" ? (
        <div className="mt-5">
          <Scorebug game={featuredGame} team={team} variant="compact" />
        </div>
      ) : featuredGame ? (
        <div className="mt-5 rounded-md bg-[var(--surface-muted)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {status?.nextGame ? "Next up" : "Latest"}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">
            {featuredGame.homeAway === "home" ? "vs" : featuredGame.homeAway === "away" ? "at" : ""}
            {" "}
            {featuredGame.opponent}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{featuredGame.shortDate}</p>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">
            {featuredGame.score ?? featuredGame.status}
          </p>
        </div>
      ) : null}
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

function TeamRoom({
  team,
  status,
  news,
}: {
  team: TeamConfig;
  status?: TeamStatus;
  news: NewsItem[];
}) {
  return (
    <article className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 rounded-md"
          style={{ background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})` }}
          aria-hidden="true"
        />
        <div>
          <h3 className="font-semibold text-[var(--text)]">{team.shortName}</h3>
          <p className="text-sm text-[var(--text-soft)]">{status?.statusLabel ?? "Feed ready"}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-[var(--border)] p-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
          >
            {item.title}
          </a>
        ))}
      </div>
    </article>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function formatNewsDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
