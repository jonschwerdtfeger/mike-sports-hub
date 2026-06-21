import { michaelProfile, TeamConfig } from "@/config/profile";
import { EspnArticle, EspnEvent, getTotalRecord, mapEspnArticle, mapEspnEvent } from "@/lib/espn-mappers";
import { asString, getArray, getRecord, isRecord } from "@/lib/sports-data-utils";
import {
  buildApTop25Standings,
  buildTeamStandings,
  ensureSelectedStandings,
  mergeTeamStandings,
  withRankingView,
} from "@/lib/sports-standings";
import type {
  GameSummary,
  NewsItem,
  RosterHighlight,
  TeamStandingSummary,
  TeamStandings,
  TeamSpotlight,
  TeamStatus,
} from "@/lib/sports-types";

export type {
  GameCompetitor,
  GameSummary,
  NewsItem,
  RosterHighlight,
  StandingsGroup,
  StandingsRow,
  StandingsView,
  StandingsViewConfig,
  TeamStandingSummary,
  TeamStandings,
  TeamSpotlight,
  TeamStatus,
} from "@/lib/sports-types";

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

const TOP_HEADLINES_LIMIT = 12;

export async function getTeamStatus(team: TeamConfig): Promise<TeamStatus> {
  const [scoreboardGames, scheduledGames] = await Promise.all([
    getTeamScoreboardGames(team),
    getTeamScheduleGames(team),
  ]);

  return buildTeamStatus(team, scoreboardGames, scheduledGames);
}

export async function getSchedule(team: TeamConfig): Promise<GameSummary[]> {
  return getTeamScheduleGames(team);
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
  return getTransactionHeadlinesFromNews(team, news);
}

export async function getDashboardData() {
  const teams = michaelProfile.teams;
  const teamData = await Promise.all(
    teams.map(async (team) => {
      const [
        scoreboardGames,
        scheduleGames,
        standing,
        news,
        standings,
        rosterHighlights,
      ] = await Promise.all([
        getTeamScoreboardGames(team),
        getTeamScheduleGames(team),
        getTeamStanding(team),
        getNews(team),
        getTeamStandings(team),
        getRosterHighlights(team),
      ]);
      const status = buildTeamStatus(team, scoreboardGames, scheduleGames);
      const transactions = getTransactionHeadlinesFromNews(team, news);
      const combinedGames = dedupeGames([...scoreboardGames, ...scheduleGames]);
      const spotlight: TeamSpotlight = {
        team,
        status,
        standing,
        lastGames: getLastCompletedGames(combinedGames, 5),
        nextGames: getNextScheduledGames(scheduleGames, 5),
        standings: ensureSelectedStandings(team, standing, standings),
        rosterHighlights: rosterHighlights.length
          ? rosterHighlights
          : fallbackRosterHighlights(team, transactions),
        news: news.slice(0, 4),
        transactions: transactions.slice(0, 4),
      };

      return {
        team,
        status,
        scoreboardGames,
        standing,
        news,
        transactions,
        spotlight,
      };
    }),
  );
  const scoreboards = teamData.map((item) => item.scoreboardGames);
  const statuses = teamData.map((item) => item.status);

  return {
    teams,
    teamSpotlights: teamData.map((item) => item.spotlight),
    statuses,
    standings: teamData.map((item) => item.standing),
    liveGames: scoreboards
      .flat()
      .filter((game) => game.state === "in")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    upcomingGames: statuses
      .map((status) => status.nextGame)
      .filter((game): game is GameSummary => Boolean(game))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    news: buildTopHeadlines(teamData, teams, TOP_HEADLINES_LIMIT),
    transactions: teamData.flatMap((item) => item.transactions).slice(0, 8),
  };
}

function buildTeamStatus(
  team: TeamConfig,
  scoreboardGames: GameSummary[],
  scheduledGames: GameSummary[],
): TeamStatus {
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

async function getTeamStandings(team: TeamConfig): Promise<TeamStandings> {
  const path = SPORT_PATHS[team.league];
  const baseUrl = `https://site.web.api.espn.com/apis/v2/sports/${path}/standings?region=us&lang=en`;
  const url = team.standingsGroupId
    ? `${baseUrl}&group=${encodeURIComponent(team.standingsGroupId)}`
    : baseUrl;

  try {
    const data = await fetchJson(url, { cache: "no-store" });
    const standings = buildTeamStandings(data, team);
    const conferenceGroupId = standings.conference?.id;
    const expandedStandings = team.standingsGroupId || standings.division || !conferenceGroupId || conferenceGroupId === "league-root"
      ? standings
      : mergeTeamStandings(
          standings,
          buildTeamStandings(
            await fetchJson(`${baseUrl}&group=${encodeURIComponent(conferenceGroupId)}`, { cache: "no-store" }),
            team,
          ),
        );

    if (team.league !== "college-football") {
      return expandedStandings;
    }

    const rankingData = await fetchJson(
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings",
      { cache: "no-store" },
    );

    return withRankingView(expandedStandings, buildApTop25Standings(rankingData, team), team);
  } catch {
    return { defaultView: "conference", views: [] };
  }
}

async function getRosterHighlights(team: TeamConfig): Promise<RosterHighlight[]> {
  const path = SPORT_PATHS[team.league];
  const leadersUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.espnTeamId}/leaders`;
  const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.espnTeamId}/roster`;
  const [leadersData, rosterData] = await Promise.all([
    fetchJson(leadersUrl, { next: { revalidate: 900 } }),
    fetchJson(rosterUrl, { next: { revalidate: 900 } }),
  ]);
  const leaderHighlights = extractLeaderHighlights(leadersData);
  const rosterHighlights = extractRosterHighlights(rosterData);

  return [...leaderHighlights, ...rosterHighlights].slice(0, 4);
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return undefined;
    }

    return response.json();
  } catch {
    return undefined;
  }
}

function getLastCompletedGames(games: GameSummary[], limit: number): GameSummary[] {
  return games
    .filter((game) => game.state === "post")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

function getNextScheduledGames(games: GameSummary[], limit: number): GameSummary[] {
  const now = Date.now();

  return games
    .filter((game) => game.state === "pre" && new Date(game.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
}

function dedupeGames(games: GameSummary[]): GameSummary[] {
  const seen = new Set<string>();

  return games.filter((game) => {
    const key = game.id || `${game.teamId}-${game.date}-${game.opponent}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildTopHeadlines(
  teamData: Array<{ team: TeamConfig; news: NewsItem[] }>,
  teams: TeamConfig[],
  limit: number,
): NewsItem[] {
  const selected: NewsItem[] = [];
  const sortedNews = sortNewsByPublishedDateDesc(teamData.flatMap((item) => item.news));

  for (const team of teams) {
    const teamHeadline = sortedNews.find((item) =>
      item.teamId === team.id && !selected.some((selectedItem) => areNewsItemsSimilar(selectedItem, item)),
    );

    if (teamHeadline) {
      selected.push(teamHeadline);
    }
  }

  for (const headline of sortedNews) {
    if (selected.length >= limit) {
      break;
    }

    if (!selected.some((item) => areNewsItemsSimilar(item, headline))) {
      selected.push(headline);
    }
  }

  return sortNewsByPublishedDateDesc(selected).slice(0, limit);
}

function sortNewsByPublishedDateDesc(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => getNewsTimestamp(b) - getNewsTimestamp(a));
}

function areNewsItemsSimilar(a: NewsItem, b: NewsItem): boolean {
  const aUrl = normalizeNewsUrl(a.url);
  const bUrl = normalizeNewsUrl(b.url);

  if (aUrl && bUrl && aUrl === bUrl) {
    return true;
  }

  const aTitle = normalizeNewsTitle(a.title);
  const bTitle = normalizeNewsTitle(b.title);

  if (!aTitle || !bTitle) {
    return false;
  }

  if (aTitle === bTitle) {
    return true;
  }

  const aTerms = new Set(aTitle.split(" ").filter(Boolean));
  const bTerms = new Set(bTitle.split(" ").filter(Boolean));
  const sharedTerms = Array.from(aTerms).filter((term) => bTerms.has(term)).length;
  const similarity = sharedTerms / Math.max(aTerms.size, bTerms.size);

  return similarity >= 0.85;
}

function normalizeNewsUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  }
}

function normalizeNewsTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(a|an|and|for|from|in|of|on|the|to|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNewsTimestamp(item: NewsItem): number {
  const timestamp = new Date(item.publishedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getTransactionHeadlinesFromNews(team: TeamConfig, news: NewsItem[]): NewsItem[] {
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

function fallbackRosterHighlights(team: TeamConfig, transactions: NewsItem[]): RosterHighlight[] {
  const transaction = transactions[0];

  return [
    {
      id: `${team.id}-roster-fallback`,
      label: "Roster pulse",
      value: transaction ? "Wire active" : "Public feed pending",
      detail: transaction?.title ?? `${team.displayName} roster details will appear when the public feed is available.`,
      source: "fallback",
    },
  ];
}

function extractLeaderHighlights(data: unknown): RosterHighlight[] {
  if (!isRecord(data)) {
    return [];
  }

  const categories = getArray(data.categories) ?? getArray(data.leaders);
  if (!categories) {
    return [];
  }

  return categories.flatMap((category, index) => {
    if (!isRecord(category)) {
      return [];
    }

    const leaders = getArray(category.leaders);
    const leader = leaders?.find(isRecord);
    const athlete = getRecord(leader?.athlete);
    const athleteName =
      asString(athlete?.displayName) ??
      asString(athlete?.shortName) ??
      asString(leader?.displayName);

    if (!athleteName) {
      return [];
    }

    return [{
      id: `leader-${index}-${athleteName}`,
      label: asString(category.displayName) ?? asString(category.name) ?? "Team leader",
      value: athleteName,
      detail: asString(leader?.displayValue) ?? asString(leader?.value),
      source: "leaders" as const,
    }];
  });
}

function extractRosterHighlights(data: unknown): RosterHighlight[] {
  const athletes = extractAthletes(data);
  if (!athletes.length) {
    return [];
  }

  const positionCounts = new Map<string, number>();
  athletes.forEach((athlete) => {
    const position =
      asString(getRecord(athlete.position)?.abbreviation) ??
      asString(getRecord(athlete.position)?.displayName) ??
      "Roster";
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  });
  const largestGroup = Array.from(positionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  const highlights: Array<RosterHighlight | undefined> = [
    {
      id: "roster-count",
      label: "Roster count",
      value: String(athletes.length),
      detail: "Players listed in the public roster feed",
      source: "roster",
    },
    largestGroup
      ? {
          id: "roster-largest-group",
          label: "Largest group",
          value: largestGroup[0],
          detail: `${largestGroup[1]} players`,
          source: "roster" as const,
        }
      : undefined,
  ];

  return highlights.filter((item): item is RosterHighlight => Boolean(item));
}

function extractAthletes(data: unknown): Array<Record<string, unknown>> {
  if (!isRecord(data)) {
    return [];
  }

  const athletes = getArray(data.athletes);
  if (athletes?.length) {
    return athletes.filter(isRecord);
  }

  const groups = getArray(data.groups);
  if (!groups) {
    return [];
  }

  return groups.flatMap((group) => getArray(getRecord(group)?.athletes)?.filter(isRecord) ?? []);
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
