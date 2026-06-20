import type { GameSummary } from "@/lib/sports-types";

export function formatGameTitle(game: GameSummary) {
  const location = game.homeAway === "away" ? "at" : game.homeAway === "home" ? "vs" : "vs";
  return `${location} ${game.opponent}`;
}

export function formatLastResult(game: GameSummary | undefined) {
  if (!game) {
    return "Results pending";
  }

  if (game.result && game.teamScore && game.opponentScore) {
    return `${game.result} ${game.teamScore}-${game.opponentScore} ${formatGameTitle(game)}`;
  }

  return `${game.score ?? game.status} ${formatGameTitle(game)}`;
}

export function formatNewsDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
