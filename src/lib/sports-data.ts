import { michaelProfile, TeamConfig } from "@/config/profile";
import { EspnArticle, EspnEvent, getTotalRecord, mapEspnArticle, mapEspnEvent } from "@/lib/espn-mappers";
import { asString, getArray, getRecord, isRecord, numberToString } from "@/lib/sports-data-utils";
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
  PlayerLeader,
  PlayerPulse,
  PlayerSignal,
  RosterSnapshot,
  TeamStandingSummary,
  TeamStandings,
  TeamSpotlight,
  TeamStatus,
} from "@/lib/sports-types";

export type {
  GameCompetitor,
  GameSummary,
  NewsItem,
  PlayerLeader,
  PlayerPulse,
  PlayerSignal,
  PlayerTrend,
  RosterSnapshot,
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

const CORE_LEAGUE_PATHS: Record<TeamConfig["league"], string> = {
  mlb: "mlb",
  nhl: "nhl",
  nfl: "nfl",
  "college-football": "college-football",
};

const FALLBACK_STATUS: Record<string, Pick<TeamStatus, "record" | "statusLabel">> = {
  phillies: { record: "Follow live feed", statusLabel: "MLB updates ready" },
  lightning: { record: "Follow live feed", statusLabel: "NHL updates ready" },
  patriots: { record: "Follow live feed", statusLabel: "NFL updates ready" },
  "gators-football": { record: "Follow live feed", statusLabel: "CFB updates ready" },
};

const AVAILABILITY_TERMS = [
  "available",
  "availability",
  "concussion",
  "day to day",
  "doubtful",
  "illness",
  "il",
  "injured",
  "injured list",
  "injured reserve",
  "injuries",
  "injury",
  "ir",
  "out for",
  "out vs",
  "physically unable to perform",
  "pup",
  "probable",
  "questionable",
  "rehab",
  "returned",
  "returns",
  "ruled out",
  "sidelined",
  "surgery",
  "suspended",
  "suspension",
  "unavailable",
];

const PERSONNEL_TERMS = [
  "activate",
  "activated",
  "acquire",
  "acquired",
  "assign",
  "call up",
  "called up",
  "claim",
  "claimed",
  "contract",
  "deal",
  "designate",
  "designated",
  "dfa",
  "draft",
  "drafted",
  "extension",
  "option",
  "optioned",
  "practice squad",
  "promote",
  "promoted",
  "recall",
  "recalled",
  "release",
  "released",
  "reinstate",
  "reinstated",
  "roster",
  "sign",
  "signed",
  "signs",
  "signing",
  "trade",
  "traded",
  "trades",
  "transfer",
  "waive",
  "waived",
  "waivers",
];

const TRANSACTION_TERMS = [
  ...AVAILABILITY_TERMS,
  ...PERSONNEL_TERMS,
];

const PLAYER_SIGNAL_LIMIT = 2;
const LEADER_SEASON_TYPE = 2;

const TEAM_NEWS_FETCH_LIMIT = 20;

const TOP_HEADLINES_LIMIT = 12;

const LEADER_PRIORITIES: Record<TeamConfig["league"], Array<{ label: string; terms: string[] }>> = {
  mlb: [
    { label: "Batting Average", terms: ["batting average", "avg"] },
    { label: "Home Runs", terms: ["home runs", "home run", "hr", "hrs"] },
    { label: "Hits", terms: ["hits", "hit", "h"] },
    { label: "RBI", terms: ["rbi", "runs batted in"] },
    { label: "ERA", terms: ["era", "earned run average"] },
    { label: "Strikeouts", terms: ["strikeouts", "strikeout", "so", "k", "ks"] },
  ],
  nhl: [
    { label: "Goals", terms: ["goals", "goal", "g"] },
    { label: "Assists", terms: ["assists", "assist", "a"] },
    { label: "Points", terms: ["points", "point", "pts"] },
    { label: "Save Percentage", terms: ["save percentage", "save pct", "save percent", "sv%"] },
    { label: "Goals Against Average", terms: ["goals against average", "gaa"] },
  ],
  nfl: [
    { label: "Passing Yards", terms: ["passing yards", "pass yards"] },
    { label: "Rushing Yards", terms: ["rushing yards", "rush yards"] },
    { label: "Receiving Yards", terms: ["receiving yards", "receiver yards"] },
    { label: "Touchdowns", terms: ["touchdowns", "touchdown", "td", "tds"] },
    { label: "Tackles", terms: ["tackles", "total tackles"] },
    { label: "Sacks", terms: ["sacks", "sack"] },
    { label: "Interceptions", terms: ["interceptions", "interception", "ints", "int"] },
  ],
  "college-football": [
    { label: "Passing Yards", terms: ["passing yards", "pass yards"] },
    { label: "Rushing Yards", terms: ["rushing yards", "rush yards"] },
    { label: "Receiving Yards", terms: ["receiving yards", "receiver yards"] },
    { label: "Touchdowns", terms: ["touchdowns", "touchdown", "td", "tds"] },
    { label: "Tackles", terms: ["tackles", "total tackles"] },
    { label: "Sacks", terms: ["sacks", "sack"] },
    { label: "Interceptions", terms: ["interceptions", "interception", "ints", "int"] },
  ],
};

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
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/news?teams=${team.espnTeamId}&limit=${TEAM_NEWS_FETCH_LIMIT}`;

  try {
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const items = articles
      .filter((article: EspnArticle) => isArticleRelevantToTeam(team, article))
      .map((article: EspnArticle, index: number) =>
        mapEspnArticle(team, article, index, "news"),
      );

    return dedupeNewsItems(sortNewsByPublishedDateDesc(items));
  } catch {
    return [];
  }
}

export async function getTransactionHeadlines(team: TeamConfig): Promise<NewsItem[]> {
  const news = await getNews(team);
  return getTransactionHeadlinesFromNews(news);
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
        teamLeaders,
        rosterSnapshot,
        injuries,
      ] = await Promise.all([
        getTeamScoreboardGames(team),
        getTeamScheduleGames(team),
        getTeamStanding(team),
        getNews(team),
        getTeamStandings(team),
        getTeamLeaders(team),
        getTeamRosterSnapshot(team),
        getTeamInjuries(team),
      ]);
      const status = buildTeamStatus(team, scoreboardGames, scheduleGames);
      const transactions = getTransactionHeadlinesFromNews(news);
      const combinedGames = dedupeGames([...scoreboardGames, ...scheduleGames]);
      const playerPulse = buildPlayerPulse(news, transactions, teamLeaders, injuries, rosterSnapshot);
      const spotlightTransactions = transactions.slice(0, 4);
      const spotlightNews = dedupeNewsItems(
        news.filter((item) => !transactions.some((transaction) => areNewsItemsSimilar(transaction, item))),
      ).slice(0, 4);
      const spotlight: TeamSpotlight = {
        team,
        status,
        standing,
        lastGames: getLastCompletedGames(combinedGames, 5),
        nextGames: getNextScheduledGames(scheduleGames, 5),
        standings: ensureSelectedStandings(team, standing, standings),
        playerPulse,
        news: spotlightNews,
        transactions: spotlightTransactions,
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
    transactions: sortNewsByPublishedDateDesc(dedupeNewsItems(teamData.flatMap((item) => item.transactions))).slice(0, 8),
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

async function getTeamLeaders(team: TeamConfig): Promise<PlayerLeader[]> {
  for (const season of getLeaderSeasonCandidates(team)) {
    const leadersUrl = `https://sports.core.api.espn.com/v2/sports/${team.sport}/leagues/${CORE_LEAGUE_PATHS[team.league]}/seasons/${season}/types/${LEADER_SEASON_TYPE}/teams/${team.espnTeamId}/leaders?lang=en&region=us`;
    const leaders = await extractCoreTeamLeaders(
      await fetchJson(leadersUrl, { next: { revalidate: 900 } }),
      team,
    );

    if (leaders.length) {
      return leaders;
    }
  }

  return [];
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

async function getTeamRosterSnapshot(team: TeamConfig): Promise<RosterSnapshot | undefined> {
  const path = SPORT_PATHS[team.league];
  const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.espnTeamId}/roster`;
  const data = await fetchJson(rosterUrl, { next: { revalidate: 900 } });

  if (!isRecord(data)) {
    return undefined;
  }

  const positionGroups = getArray(data.athletes)?.filter(isRecord) ?? [];
  const groupSummaries = positionGroups.map((group) => {
    const players = getArray(group.items)?.filter(isRecord) ?? [];
    return {
      name: asString(getRecord(group.position)?.displayName) ?? asString(group.position) ?? "Roster",
      players,
    };
  });
  const players = groupSummaries.flatMap((group) => group.players);

  if (!players.length) {
    return undefined;
  }

  const activePlayers = players.filter((player) => getRosterPlayerStatus(player) === "active").length;
  const injuredPlayers = players.filter((player) => {
    const status = getRosterPlayerStatus(player);
    const injuries = getArray(player.injuries) ?? [];
    return injuries.length > 0 || Boolean(status && status !== "active");
  }).length;
  const largestPositionGroup = groupSummaries
    .map((group) => ({ name: group.name, count: group.players.length }))
    .sort((a, b) => b.count - a.count)[0];

  return {
    totalPlayers: players.length,
    activePlayers,
    injuredPlayers,
    largestPositionGroup,
  };
}

async function getTeamInjuries(team: TeamConfig): Promise<PlayerSignal[]> {
  const path = SPORT_PATHS[team.league];
  const injuriesUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/injuries?team=${team.espnTeamId}`;
  const data = await fetchJson(injuriesUrl, { next: { revalidate: 900 } });

  if (!isRecord(data) || !isEspnTeamScoped(data.team, team)) {
    return [];
  }

  return (getArray(data.injuries) ?? [])
    .filter(isRecord)
    .filter((injury) => isEspnTeamScoped(getRecord(getRecord(injury.athlete)?.team) ?? data.team, team))
    .sort((a, b) => getInjuryTimestamp(b) - getInjuryTimestamp(a))
    .slice(0, PLAYER_SIGNAL_LIMIT)
    .map((injury, index) => {
      const athlete = getRecord(injury.athlete);
      const playerName = asString(athlete?.displayName) ?? asString(athlete?.shortName) ?? `${team.shortName} player`;
      const status = asString(injury.status) ?? asString(injury.type) ?? "Availability update";
      const detail = asString(injury.details) ?? asString(injury.description) ?? asString(injury.comment);
      const title = detail ? `${playerName}: ${status} - ${detail}` : `${playerName}: ${status}`;

      return {
        id: `${team.id}-injury-${asString(injury.date) ?? index}-${playerName}`,
        label: "Availability Watch",
        title,
        source: "ESPN Injuries",
        publishedAt: asString(injury.date),
      };
    });
}

function getRosterPlayerStatus(player: Record<string, unknown>): string | undefined {
  const status = getRecord(player.status);
  return normalizeSearchText(asString(status?.type) ?? asString(status?.name) ?? asString(player.status) ?? "").trim() || undefined;
}

function isEspnTeamScoped(value: unknown, team: TeamConfig): boolean {
  const record = getRecord(value);
  return String(record?.id ?? "") === team.espnTeamId;
}

function getInjuryTimestamp(injury: Record<string, unknown>): number {
  const timestamp = new Date(asString(injury.date) ?? "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
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

function isArticleRelevantToTeam(team: TeamConfig, article: EspnArticle): boolean {
  const articleTeamIds = getArticleTeamIds(article);

  if (articleTeamIds.length) {
    return articleTeamIds.includes(team.espnTeamId);
  }

  return matchesTeamIdentity(team, article);
}

function getArticleTeamIds(article: EspnArticle): string[] {
  return article.categories
    ?.filter((category) => category.type === "team")
    .map((category) => category.teamId ?? category.team?.id)
    .filter((id): id is number | string => id !== undefined && id !== null)
    .map(String) ?? [];
}

function matchesTeamIdentity(team: TeamConfig, article: EspnArticle): boolean {
  const searchableText = normalizeSearchText([
    article.headline,
    article.description,
    article.links?.web?.href,
  ].filter(Boolean).join(" "));
  const identityTerms = [
    team.displayName,
    team.shortName,
    ...team.newsTerms,
  ];

  return identityTerms.some((term) =>
    searchableText.includes(normalizeSearchText(term)),
  );
}

function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const selected: NewsItem[] = [];

  for (const item of items) {
    if (!selected.some((selectedItem) => areNewsItemsSimilar(selectedItem, item))) {
      selected.push(item);
    }
  }

  return selected;
}

function buildTopHeadlines(
  teamData: Array<{ team: TeamConfig; news: NewsItem[] }>,
  teams: TeamConfig[],
  limit: number,
): NewsItem[] {
  const selected: NewsItem[] = [];
  const sortedNews = sortNewsByPublishedDateDesc(dedupeNewsItems(teamData.flatMap((item) => item.news)));

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

function buildPlayerPulse(
  news: NewsItem[],
  transactions: NewsItem[],
  teamLeaders: PlayerLeader[],
  injurySignals: PlayerSignal[],
  rosterSnapshot: RosterSnapshot | undefined,
): PlayerPulse {
  const newsAvailabilitySignals = buildPlayerSignals(
    news.filter((item) => !isFallbackNewsItem(item) && isAvailabilityHeadline(item)),
    "Availability Watch",
  );

  return {
    teamLeaders,
    hotPlayers: [],
    availabilitySignals: dedupePlayerSignals([...injurySignals, ...newsAvailabilitySignals]).slice(0, PLAYER_SIGNAL_LIMIT),
    personnelSignals: buildPlayerSignals(
      transactions.filter((item) => !isFallbackNewsItem(item) && isPersonnelHeadline(item)),
      "Personnel Signal",
    ),
    rosterSnapshot,
  };
}

function buildPlayerSignals(items: NewsItem[], label: string): PlayerSignal[] {
  return dedupeNewsItems(sortNewsByPublishedDateDesc(items))
    .slice(0, PLAYER_SIGNAL_LIMIT)
    .map((item) => ({
      id: `${item.id}-${label}`,
      label,
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
    }));
}

function dedupePlayerSignals(items: PlayerSignal[]): PlayerSignal[] {
  const selected: PlayerSignal[] = [];

  for (const item of items) {
    const matchingItem = selected.some((selectedItem) => {
      if (item.url && selectedItem.url && normalizeNewsUrl(item.url) === normalizeNewsUrl(selectedItem.url)) {
        return true;
      }

      return normalizeNewsTitle(item.title) === normalizeNewsTitle(selectedItem.title);
    });

    if (!matchingItem) {
      selected.push(item);
    }
  }

  return selected;
}

function isAvailabilityHeadline(item: NewsItem): boolean {
  return matchesAnyHeadlineTerm(item.title, AVAILABILITY_TERMS);
}

function isPersonnelHeadline(item: NewsItem): boolean {
  return matchesAnyHeadlineTerm(item.title, PERSONNEL_TERMS);
}

function isFallbackNewsItem(item: NewsItem): boolean {
  return item.source === "ESPN Search" || item.id.endsWith("-fallback");
}

function matchesAnyHeadlineTerm(title: string, terms: string[]): boolean {
  const searchableTitle = normalizeSearchText(title);
  return terms.some((term) => searchableTitle.includes(normalizeSearchText(term)));
}

function normalizeSearchText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function getTransactionHeadlinesFromNews(news: NewsItem[]): NewsItem[] {
  const filtered = news.filter((item) =>
    matchesAnyHeadlineTerm(item.title, TRANSACTION_TERMS),
  );

  return dedupeNewsItems(sortNewsByPublishedDateDesc(filtered)).map((item) => ({
    ...item,
    category: "transaction",
  }));
}

async function extractCoreTeamLeaders(data: unknown, team: TeamConfig): Promise<PlayerLeader[]> {
  if (!isRecord(data)) {
    return [];
  }

  const categories = getArray(data.categories);
  if (!categories) {
    return [];
  }

  const leaders = categories.flatMap((category, index) => {
    if (!isRecord(category)) {
      return [];
    }

    const rawCategoryLabel = asString(category.displayName) ?? asString(category.name);
    if (!rawCategoryLabel) {
      return [];
    }

    const priority = getLeaderPriority(team.league, rawCategoryLabel);
    if (!priority) {
      return [];
    }

    const categoryLeaders = getArray(category.leaders);
    const leader = categoryLeaders?.find(isRecord);
    if (!leader) {
      return [];
    }

    const athlete = getRecord(leader.athlete);
    const athleteName = asString(athlete?.displayName) ?? asString(athlete?.shortName) ?? asString(leader.displayName);
    const athleteRef = asString(athlete?.["$ref"]);
    const leaderValue = asString(leader.displayValue) ?? numberToString(leader.value);

    return [{
      id: `leader-${index}-${athleteName}`,
      label: priority.label,
      playerName: athleteName,
      athleteRef,
      value: leaderValue ?? "Leader",
      priorityIndex: priority.index,
      sourceIndex: index,
    }];
  });

  const seenPriorities = new Set<number>();

  const selectedLeaders = leaders
    .sort((a, b) => a.priorityIndex - b.priorityIndex || a.sourceIndex - b.sourceIndex)
    .filter((leader) => {
      if (seenPriorities.has(leader.priorityIndex)) {
        return false;
      }

      seenPriorities.add(leader.priorityIndex);
      return true;
    })
    .slice(0, getTeamLeaderLimit(team));

  return Promise.all(selectedLeaders.map(async (leader) => ({
      id: leader.id,
      label: leader.label,
      playerName: leader.playerName ?? await getCoreAthleteName(leader.athleteRef) ?? "Team leader",
      value: leader.value,
    })));
}

async function getCoreAthleteName(athleteRef: string | undefined): Promise<string | undefined> {
  if (!athleteRef) {
    return undefined;
  }

  const athlete = getRecord(await fetchJson(athleteRef.replace(/^http:\/\//, "https://"), { next: { revalidate: 900 } }));
  return asString(athlete?.displayName) ?? asString(athlete?.shortName) ?? asString(athlete?.fullName);
}

function getLeaderSeasonCandidates(team: TeamConfig): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const candidates = team.sport === "football" && now.getMonth() < 7
    ? [currentYear - 1, currentYear]
    : [currentYear, currentYear - 1];

  return [...new Set(candidates.map(String))];
}

function getTeamLeaderLimit(team: TeamConfig): number {
  return LEADER_PRIORITIES[team.league].length;
}

function getLeaderPriority(league: TeamConfig["league"], categoryLabel: string): { index: number; label: string } | undefined {
  const normalizedCategory = normalizeLeaderLabel(categoryLabel);
  const priorities = LEADER_PRIORITIES[league];
  const index = priorities.findIndex((priority) =>
    priority.terms.some((term) => matchesLeaderTerm(normalizedCategory, term)),
  );

  return index >= 0 ? { index, label: priorities[index].label } : undefined;
}

function matchesLeaderTerm(normalizedCategory: string, term: string): boolean {
  const normalizedTerm = normalizeLeaderLabel(term);
  if (normalizedCategory === normalizedTerm) {
    return true;
  }

  return normalizedTerm.includes(" ") && normalizedCategory.includes(normalizedTerm);
}

function normalizeLeaderLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
