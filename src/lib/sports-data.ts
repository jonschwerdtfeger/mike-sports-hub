import { michaelProfile, TeamConfig } from "@/config/profile";

export type GameSummary = {
  id: string;
  teamId: string;
  date: string;
  shortDate: string;
  opponent: string;
  homeAway: "home" | "away" | "neutral";
  state: "pre" | "in" | "post";
  status: string;
  score?: string;
  venue?: string;
  period?: number;
  periodLabel?: string;
  clock?: string;
  outsText?: string;
  bases?: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  competitors?: {
    home: GameCompetitor;
    away: GameCompetitor;
  };
};

export type TeamStatus = {
  teamId: string;
  record: string;
  liveGame?: GameSummary;
  lastGame?: GameSummary;
  nextGame?: GameSummary;
  statusLabel: string;
  updatedAt: string;
};

export type TeamStandingSummary = {
  teamId: string;
  record?: string;
  standing?: string;
  label?: string;
};

export type GameCompetitor = {
  id?: string;
  abbreviation: string;
  displayName: string;
  shortName: string;
  score?: string;
  homeAway: "home" | "away";
  color?: string;
};

export type NewsItem = {
  id: string;
  teamId: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "news" | "transaction";
};

const SPORT_PATHS: Record<TeamConfig["league"], string> = {
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  nfl: "football/nfl",
  "college-football": "football/college-football",
};

const FALLBACK_STATUS: Record<string, Pick<TeamStatus, "record" | "statusLabel">> = {
  phillies: { record: "Follow live feed", statusLabel: "MLB updates ready" },
  lightning: { record: "Follow live feed", statusLabel: "NHL updates ready" },
  patriots: { record: "Follow live feed", statusLabel: "NFL updates ready" },
  "gators-football": { record: "Follow live feed", statusLabel: "CFB updates ready" },
};

const TRANSACTION_TERMS = [
  "acquire",
  "assign",
  "claim",
  "deal",
  "draft",
  "injury",
  "injured",
  "IR",
  "option",
  "practice squad",
  "recall",
  "release",
  "roster",
  "sign",
  "trade",
  "transfer",
  "waive",
];

export async function getTeamStatus(team: TeamConfig): Promise<TeamStatus> {
  const [scoreboardGames, scheduledGames] = await Promise.all([
    getTeamScoreboardGames(team),
    getTeamScheduleGames(team),
  ]);
  const now = Date.now();
  const live = scoreboardGames
    .filter((event) => event.state === "in")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completed = scoreboardGames
    .filter((event) => event.state === "post")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const nextGame = getNextScheduledGame(scheduledGames, now);
  const fallback = FALLBACK_STATUS[team.id];
  const liveGame = live[0];

  return {
    teamId: team.id,
    record: fallback.record,
    liveGame,
    lastGame: completed[0],
    nextGame,
    statusLabel: liveGame
      ? `Live: ${liveGame.periodLabel ?? liveGame.status}`
      : nextGame
        ? `Next: ${nextGame.shortDate}`
        : fallback.statusLabel,
    updatedAt: new Date().toISOString(),
  };
}

export async function getSchedule(team: TeamConfig): Promise<GameSummary[]> {
  return getTeamScheduleGames(team);
}

async function getTeamScheduleGames(team: TeamConfig): Promise<GameSummary[]> {
  const path = SPORT_PATHS[team.league];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.espnTeamId}/schedule`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const events: EspnEvent[] = Array.isArray(data.events) ? data.events : [];
    return events
      .map((event: EspnEvent) => mapEspnEvent(team, event))
      .filter((event): event is GameSummary => Boolean(event));
  } catch {
    return [];
  }
}

async function getTeamScoreboardGames(team: TeamConfig): Promise<GameSummary[]> {
  const path = SPORT_PATHS[team.league];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?teams=${team.espnTeamId}&limit=8`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const events: EspnEvent[] = Array.isArray(data.events) ? data.events : [];
    return events
      .map((event: EspnEvent) => mapEspnEvent(team, event))
      .filter((event): event is GameSummary => Boolean(event));
  } catch {
    return [];
  }
}

function getNextScheduledGame(games: GameSummary[], now: number): GameSummary | undefined {
  return games
    .filter((game) => game.state === "pre" && new Date(game.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
}

export async function getTeamStanding(team: TeamConfig): Promise<TeamStandingSummary> {
  const path = SPORT_PATHS[team.league];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.espnTeamId}`;

  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) {
      return { teamId: team.id };
    }

    const data = await response.json();
    const record = getTotalRecord(data.team?.record);
    const standing = normalizeStanding(data.team?.standingSummary);
    const label = [record, standing].filter(Boolean).join(", ") || undefined;

    return {
      teamId: team.id,
      record,
      standing,
      label,
    };
  } catch {
    return { teamId: team.id };
  }
}

export async function getNews(team: TeamConfig): Promise<NewsItem[]> {
  const path = SPORT_PATHS[team.league];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/news?teams=${team.espnTeamId}&limit=8`;

  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) {
      return fallbackNews(team, "news");
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const items = articles.map((article: EspnArticle, index: number) =>
      mapEspnArticle(team, article, index, "news"),
    );
    return items.length ? items : fallbackNews(team, "news");
  } catch {
    return fallbackNews(team, "news");
  }
}

export async function getTransactionHeadlines(team: TeamConfig): Promise<NewsItem[]> {
  const news = await getNews(team);
  const filtered = news.filter((item) =>
    TRANSACTION_TERMS.some((term) =>
      item.title.toLowerCase().includes(term.toLowerCase()),
    ),
  );

  return (filtered.length ? filtered : fallbackNews(team, "transaction")).map((item) => ({
    ...item,
    category: "transaction",
  }));
}

export async function getDashboardData() {
  const teams = michaelProfile.teams;
  const [statuses, scoreboards, standings, newsGroups, transactionGroups] = await Promise.all([
    Promise.all(teams.map(getTeamStatus)),
    Promise.all(teams.map(getTeamScoreboardGames)),
    Promise.all(teams.map(getTeamStanding)),
    Promise.all(teams.map(getNews)),
    Promise.all(teams.map(getTransactionHeadlines)),
  ]);

  return {
    teams,
    statuses,
    standings,
    liveGames: scoreboards
      .flat()
      .filter((game) => game.state === "in")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    upcomingGames: statuses
      .map((status) => status.nextGame)
      .filter((game): game is GameSummary => Boolean(game))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    news: newsGroups.flat(),
    transactions: transactionGroups.flat().slice(0, 8),
  };
}

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: {
    period?: number;
    displayClock?: string;
    type?: { shortDetail?: string; detail?: string; state?: string };
  };
  competitions?: Array<{
    venue?: { fullName?: string };
    outsText?: string;
    situation?: {
      onFirst?: boolean;
      onSecond?: boolean;
      onThird?: boolean;
    };
    competitors?: EspnCompetitor[];
  }>;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    id?: string;
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
    color?: string;
  };
};

type EspnRecord = {
  items?: Array<{
    type?: string;
    summary?: string;
  }>;
};

type EspnArticle = {
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  links?: { web?: { href?: string } };
  source?: string;
};

function getTotalRecord(record: EspnRecord | undefined): string | undefined {
  const total = record?.items?.find((item) => item.type === "total");
  return total?.summary || undefined;
}

function normalizeStanding(standing: unknown): string | undefined {
  if (typeof standing !== "string" || !standing.trim()) {
    return undefined;
  }

  return standing
    .replace(/\s+in\s+/i, " ")
    .replace(/\s+Division$/i, "")
    .trim();
}

function mapEspnEvent(team: TeamConfig, event: EspnEvent): GameSummary | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const selected = competitors.find((entry) => entry.team?.id === team.espnTeamId);
  const opponent = competitors.find((entry) => entry.team?.id !== team.espnTeamId);
  const home = competitors.find((entry) => entry.homeAway === "home");
  const away = competitors.find((entry) => entry.homeAway === "away");
  const date = event.date;
  const gameState = normalizeGameState(event.status?.type?.state);

  if (!date || !selected || !opponent) {
    return null;
  }

  const selectedScore = selected?.score;
  const opponentScore = opponent.score;
  const status = event.status?.type?.shortDetail ?? event.status?.type?.detail ?? "Scheduled";
  const periodLabel = event.status?.type?.shortDetail ?? event.status?.type?.detail;

  return {
    id: event.id ?? `${team.id}-${date}`,
    teamId: team.id,
    date,
    shortDate: formatShortDate(date),
    opponent: opponent.team?.shortDisplayName ?? opponent.team?.displayName ?? event.shortName ?? "TBD",
    homeAway: selected?.homeAway ?? "neutral",
    state: gameState,
    status,
    score:
      gameState !== "pre" && selectedScore && opponentScore
        ? `${selectedScore}-${opponentScore}`
        : undefined,
    venue: competition?.venue?.fullName,
    period: event.status?.period,
    periodLabel,
    clock: event.status?.displayClock,
    outsText: competition?.outsText,
    bases: competition?.situation
      ? {
          first: Boolean(competition.situation.onFirst),
          second: Boolean(competition.situation.onSecond),
          third: Boolean(competition.situation.onThird),
        }
      : undefined,
    competitors: home && away
      ? {
          home: mapCompetitor(home),
          away: mapCompetitor(away),
        }
      : undefined,
  };
}

function normalizeGameState(state: string | undefined): GameSummary["state"] {
  if (state === "in" || state === "post") {
    return state;
  }

  return "pre";
}

function mapCompetitor(competitor: EspnCompetitor): GameCompetitor {
  const displayName = competitor.team?.displayName ?? competitor.team?.shortDisplayName ?? "Team";

  return {
    id: competitor.team?.id,
    abbreviation: competitor.team?.abbreviation ?? competitor.team?.shortDisplayName ?? displayName,
    displayName,
    shortName: competitor.team?.shortDisplayName ?? displayName,
    score: competitor.score,
    homeAway: competitor.homeAway ?? "home",
    color: competitor.team?.color ? `#${competitor.team.color}` : undefined,
  };
}

function mapEspnArticle(
  team: TeamConfig,
  article: EspnArticle,
  index: number,
  category: NewsItem["category"],
): NewsItem {
  return {
    id: `${team.id}-${category}-${index}-${article.published ?? article.headline ?? "item"}`,
    teamId: team.id,
    title: article.headline ?? article.description ?? `${team.displayName} update`,
    url: article.links?.web?.href ?? `https://www.espn.com/search/_/q/${encodeURIComponent(team.displayName)}`,
    source: article.source ?? "ESPN",
    publishedAt: article.published ?? article.lastModified ?? new Date().toISOString(),
    category,
  };
}

function fallbackNews(team: TeamConfig, category: NewsItem["category"]): NewsItem[] {
  const query =
    category === "transaction"
      ? `${team.displayName} roster transactions`
      : `${team.displayName} news`;

  return [
    {
      id: `${team.id}-${category}-fallback`,
      teamId: team.id,
      title:
        category === "transaction"
          ? `${team.displayName} roster and injury headlines`
          : `${team.displayName} latest team headlines`,
      url: `https://www.espn.com/search/_/q/${encodeURIComponent(query)}`,
      source: "ESPN Search",
      publishedAt: new Date().toISOString(),
      category,
    },
  ];
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
