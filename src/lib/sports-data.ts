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
  teamScore?: string;
  opponentScore?: string;
  result?: "W" | "L" | "T";
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

export type StandingsRow = {
  id: string;
  teamId?: string;
  rank?: string;
  teamName: string;
  record?: string;
  detail?: string;
  streak?: string;
  isSelected: boolean;
};

export type RosterHighlight = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  source: "leaders" | "roster" | "fallback";
};

export type TeamSpotlight = {
  team: TeamConfig;
  status: TeamStatus;
  standing: TeamStandingSummary;
  lastGames: GameSummary[];
  nextGames: GameSummary[];
  standingsRows: StandingsRow[];
  rosterHighlights: RosterHighlight[];
  news: NewsItem[];
  transactions: NewsItem[];
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

  return buildTeamStatus(team, scoreboardGames, scheduledGames);
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
  return getTransactionHeadlinesFromNews(team, news);
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

export async function getDashboardData() {
  const teams = michaelProfile.teams;
  const teamData = await Promise.all(
    teams.map(async (team) => {
      const [
        scoreboardGames,
        scheduleGames,
        standing,
        news,
        standingsRows,
        rosterHighlights,
      ] = await Promise.all([
        getTeamScoreboardGames(team),
        getTeamScheduleGames(team),
        getTeamStanding(team),
        getNews(team),
        getRelevantStandings(team),
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
        standingsRows: ensureSelectedStandingRow(team, standing, standingsRows),
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
    news: teamData.flatMap((item) => item.news),
    transactions: teamData.flatMap((item) => item.transactions).slice(0, 8),
  };
}

async function getRelevantStandings(team: TeamConfig): Promise<StandingsRow[]> {
  const path = SPORT_PATHS[team.league];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/standings`;

  try {
    const data = await fetchJson(url, { next: { revalidate: 900 } });
    const allRows = dedupeStandingRows(extractStandingRows(data, team));
    const selectedIndex = allRows.findIndex((row) => row.isSelected);

    if (selectedIndex >= 0) {
      const start = Math.max(0, selectedIndex - 2);
      return allRows.slice(start, start + 5);
    }

    return allRows.slice(0, 5);
  } catch {
    return [];
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

function ensureSelectedStandingRow(
  team: TeamConfig,
  standing: TeamStandingSummary,
  rows: StandingsRow[],
): StandingsRow[] {
  if (rows.some((row) => row.isSelected)) {
    return rows;
  }

  return [
    {
      id: `${team.id}-standing-fallback`,
      teamId: team.espnTeamId,
      teamName: team.displayName,
      record: standing.record,
      detail: standing.standing ?? "Public standings feed pending",
      isSelected: true,
    },
    ...rows,
  ].slice(0, 5);
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

function extractStandingRows(data: unknown, team: TeamConfig): StandingsRow[] {
  const rows: StandingsRow[] = [];
  collectStandingEntries(data, team, rows);
  return rows;
}

function collectStandingEntries(value: unknown, team: TeamConfig, rows: StandingsRow[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectStandingEntries(item, team, rows));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const entries = getArray(value.entries);
  if (entries?.some((entry) => isRecord(entry) && isRecord(entry.team))) {
    entries.forEach((entry) => {
      const row = mapStandingRow(entry, team);
      if (row) {
        rows.push(row);
      }
    });
  }

  ["children", "groups", "conferences", "divisions", "standings"].forEach((key) => {
    collectStandingEntries(value[key], team, rows);
  });
}

function mapStandingRow(entry: unknown, team: TeamConfig): StandingsRow | null {
  if (!isRecord(entry) || !isRecord(entry.team)) {
    return null;
  }

  const teamInfo = entry.team;
  const providerId = asString(teamInfo.id);
  const abbreviation = asString(teamInfo.abbreviation);
  const teamName =
    asString(teamInfo.displayName) ??
    asString(teamInfo.shortDisplayName) ??
    asString(teamInfo.name) ??
    "Team";
  const stats = getArray(entry.stats);
  const record =
    asString(getRecord(entry.record)?.summary) ??
    buildRecordFromStats(stats);
  const rank =
    getStatDisplay(stats, "rank") ??
    getStatDisplay(stats, "playoffSeed") ??
    getStatDisplay(stats, "divisionRank");
  const gamesBehind = getStatDisplay(stats, "gamesBehind");
  const points = getStatDisplay(stats, "points");
  const streak = getStatDisplay(stats, "streak");
  const detail = [points ? `${points} pts` : undefined, gamesBehind ? `${gamesBehind} GB` : undefined]
    .filter(Boolean)
    .join(" - ") || undefined;

  return {
    id: providerId ?? `${teamName}-${record ?? rank ?? "standing"}`,
    teamId: providerId,
    rank,
    teamName,
    record,
    detail,
    streak,
    isSelected:
      providerId === team.espnTeamId ||
      abbreviation?.toLowerCase() === team.espnAbbreviation.toLowerCase() ||
      teamName.toLowerCase() === team.displayName.toLowerCase(),
  };
}

function dedupeStandingRows(rows: StandingsRow[]): StandingsRow[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${row.teamId ?? ""}-${row.teamName}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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

function buildRecordFromStats(stats: unknown[] | undefined): string | undefined {
  const wins = getStatDisplay(stats, "wins");
  const losses = getStatDisplay(stats, "losses");
  const ties = getStatDisplay(stats, "ties");
  const otLosses = getStatDisplay(stats, "otLosses");

  if (!wins || !losses) {
    return undefined;
  }

  return [wins, losses, ties !== "0" ? ties : undefined, otLosses !== "0" ? otLosses : undefined]
    .filter(Boolean)
    .join("-");
}

function getStatDisplay(stats: unknown[] | undefined, name: string): string | undefined {
  const stat = stats
    ?.filter(isRecord)
    .find((item) => asString(item.name) === name || asString(item.abbreviation) === name);

  return asString(stat?.displayValue) ?? numberToString(stat?.value);
}

function getArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberToString(value: unknown): string | undefined {
  return typeof value === "number" ? String(value) : undefined;
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
  score?: string | {
    value?: number;
    displayValue?: string;
  };
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

  if (!date || !selected || !opponent) {
    return null;
  }

  const selectedScore = normalizeScore(selected.score);
  const opponentScore = normalizeScore(opponent.score);
  const gameState = normalizeGameState(event.status?.type?.state, date, selectedScore, opponentScore);
  const result = getGameResult(gameState, selectedScore, opponentScore);
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
    teamScore: selectedScore,
    opponentScore,
    result,
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

function normalizeGameState(
  state: string | undefined,
  date: string,
  selectedScore?: string,
  opponentScore?: string,
): GameSummary["state"] {
  if (state === "in" || state === "post") {
    return state;
  }

  if (selectedScore !== undefined && opponentScore !== undefined && new Date(date).getTime() < Date.now()) {
    return "post";
  }

  return "pre";
}

function getGameResult(
  gameState: GameSummary["state"],
  selectedScore: string | undefined,
  opponentScore: string | undefined,
): GameSummary["result"] {
  if (gameState !== "post" || selectedScore === undefined || opponentScore === undefined) {
    return undefined;
  }

  const selectedScoreValue = Number(selectedScore);
  const opponentScoreValue = Number(opponentScore);

  if (!Number.isFinite(selectedScoreValue) || !Number.isFinite(opponentScoreValue)) {
    return undefined;
  }

  if (selectedScoreValue > opponentScoreValue) {
    return "W";
  }

  if (selectedScoreValue < opponentScoreValue) {
    return "L";
  }

  return "T";
}

function mapCompetitor(competitor: EspnCompetitor): GameCompetitor {
  const displayName = competitor.team?.displayName ?? competitor.team?.shortDisplayName ?? "Team";

  return {
    id: competitor.team?.id,
    abbreviation: competitor.team?.abbreviation ?? competitor.team?.shortDisplayName ?? displayName,
    displayName,
    shortName: competitor.team?.shortDisplayName ?? displayName,
    score: normalizeScore(competitor.score),
    homeAway: competitor.homeAway ?? "home",
    color: competitor.team?.color ? `#${competitor.team.color}` : undefined,
  };
}

function normalizeScore(score: EspnCompetitor["score"]): string | undefined {
  if (typeof score === "string") {
    return score;
  }

  if (typeof score?.displayValue === "string") {
    return score.displayValue;
  }

  if (typeof score?.value === "number") {
    return String(score.value);
  }

  return undefined;
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
