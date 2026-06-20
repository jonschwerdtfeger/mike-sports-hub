import type { TeamConfig } from "@/config/profile";

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

export type StandingsView = "division" | "conference" | "league" | "ranking";

export type StandingsGroup = {
  id: string;
  name: string;
  rows: StandingsRow[];
};

export type StandingsViewConfig = {
  id: StandingsView;
  label: string;
  group: StandingsGroup;
};

export type TeamStandings = {
  division?: StandingsGroup;
  conference?: StandingsGroup;
  league?: StandingsGroup;
  ranking?: StandingsGroup;
  views: StandingsViewConfig[];
  defaultView: StandingsView;
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
  standings: TeamStandings;
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
