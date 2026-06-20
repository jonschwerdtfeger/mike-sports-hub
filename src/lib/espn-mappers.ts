import type { TeamConfig } from "@/config/profile";
import { formatShortDate } from "@/lib/sports-format";
import type { GameCompetitor, GameSummary, NewsItem } from "@/lib/sports-types";

export type EspnEvent = {
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

export type EspnRecord = {
  items?: Array<{
    type?: string;
    summary?: string;
  }>;
};

export type EspnArticle = {
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  links?: { web?: { href?: string } };
  source?: string;
};

export function mapEspnEvent(team: TeamConfig, event: EspnEvent): GameSummary | null {
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

export function mapEspnArticle(
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

export function getTotalRecord(record: EspnRecord | undefined): string | undefined {
  const total = record?.items?.find((item) => item.type === "total");
  return total?.summary || undefined;
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
