import type { TeamConfig } from "@/config/profile";
import {
  asString,
  buildRecordFromStats,
  getArray,
  getRecord,
  getStatDisplay,
  isRecord,
  numberToString,
} from "@/lib/sports-data-utils";
import type {
  StandingsGroup,
  StandingsRow,
  StandingsView,
  StandingsViewConfig,
  TeamStandingSummary,
  TeamStandings,
} from "@/lib/sports-types";

type ParsedStandingsGroup = {
  id: string;
  name: string;
  rows: StandingsRow[];
  children: ParsedStandingsGroup[];
};

export function buildTeamStandings(data: unknown, team: TeamConfig): TeamStandings {
  const root = parseStandingsGroup(data, team, "league-root", "League");
  if (!root) {
    return finalizeTeamStandings({ defaultView: "conference", views: [] }, team);
  }

  const leagueRows = root.rows.length ? root.rows : flattenStandingsRows(root.children);
  const selectedPath = findSelectedStandingsPath(root);
  const selectedGroup = selectedPath[selectedPath.length - 1];
  const selectedParent = selectedPath.length > 1 ? selectedPath[selectedPath.length - 2] : undefined;
  const rootIsConference = isLikelyConferenceRoot(root);
  const hasChildSelectedGroup = Boolean(selectedGroup?.children.some((child) => containsSelectedStanding(child)));
  const divisionSource =
    selectedGroup &&
    selectedParent &&
    !hasChildSelectedGroup &&
    isDivisionStandingsGroup(selectedGroup, selectedPath.length, rootIsConference)
      ? selectedGroup
      : undefined;
  const conferenceSource = getConferenceSource(root, selectedPath, rootIsConference);
  const conferenceRows = conferenceSource
    ? conferenceSource.rows.length
      ? conferenceSource.rows
      : flattenStandingsRows(conferenceSource.children)
    : [];
  const standings: TeamStandings = { defaultView: "conference", views: [] };

  if (divisionSource?.rows.length) {
    standings.division = toStandingsGroup(divisionSource, divisionSource.rows);
  }

  if (conferenceSource && conferenceRows.length) {
    standings.conference = toStandingsGroup(conferenceSource, conferenceRows);
  }

  if (leagueRows.length) {
    standings.league = {
      id: root.id,
      name: root.name,
      rows: dedupeStandingRows(leagueRows),
    };
  }

  standings.defaultView = getDefaultStandingsView(standings, team);

  return finalizeTeamStandings(standings, team);
}

export function mergeTeamStandings(base: TeamStandings, supplement: TeamStandings): TeamStandings {
  const merged: TeamStandings = {
    division: supplement.division ?? base.division,
    conference: base.conference ?? supplement.conference,
    league: base.league ?? supplement.league,
    ranking: base.ranking ?? supplement.ranking,
    defaultView: "conference",
    views: [],
  };
  merged.defaultView = getDefaultStandingsView(merged);

  return finalizeTeamStandings(merged);
}

export function ensureSelectedStandings(
  team: TeamConfig,
  standing: TeamStandingSummary,
  standings: TeamStandings,
): TeamStandings {
  const fallbackGroup = buildFallbackStandingsGroup(team, standing);
  const hasSelected = (group: StandingsGroup | undefined) => group?.rows.some((row) => row.isSelected);

  if (hasSelected(standings.division) || hasSelected(standings.conference) || hasSelected(standings.league)) {
    return standings;
  }

  return {
    ...standings,
    conference: standings.conference ?? fallbackGroup,
    defaultView: standings.conference ? standings.defaultView : "conference",
    views: standings.views.length ? standings.views : buildStandingsViews({ ...standings, conference: standings.conference ?? fallbackGroup }, team),
  };
}

export function buildApTop25Standings(data: unknown, team: TeamConfig): StandingsGroup | undefined {
  if (!isRecord(data)) {
    return undefined;
  }

  const apRanking = getArray(data.rankings)
    ?.filter(isRecord)
    .find((ranking) => asString(ranking.name) === "AP Top 25");
  const ranks = getArray(apRanking?.ranks);
  const rows = ranks
    ?.map((entry) => mapRankingRow(entry, team))
    .filter((row): row is StandingsRow => Boolean(row)) ?? [];

  if (!rows.length) {
    return undefined;
  }

  return {
    id: "ap-top-25",
    name: asString(apRanking?.name) ?? "AP Top 25",
    rows,
  };
}

export function withRankingView(standings: TeamStandings, ranking: StandingsGroup | undefined, team: TeamConfig): TeamStandings {
  const next: TeamStandings = {
    ...standings,
    ranking,
    defaultView: team.league === "college-football" ? "conference" : standings.defaultView,
    views: [],
  };

  return finalizeTeamStandings(next, team);
}

function parseStandingsGroup(
  value: unknown,
  team: TeamConfig,
  fallbackId: string,
  fallbackName: string,
): ParsedStandingsGroup | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const standings = getRecord(value.standings);
  const entries = getArray(standings?.entries) ?? getArray(value.entries);
  const rows = entries
    ?.map((entry) => mapStandingRow(entry, team))
    .filter((row): row is StandingsRow => Boolean(row)) ?? [];
  const children = (getArray(value.children) ?? getArray(value.groups) ?? [])
    .map((child, index) => parseStandingsGroup(child, team, `${fallbackId}-${index}`, fallbackName))
    .filter((group): group is ParsedStandingsGroup => Boolean(group));
  const id = asString(value.id) ?? asString(value.uid) ?? fallbackId;
  const name =
    asString(value.displayName) ??
    asString(value.name) ??
    asString(value.shortName) ??
    asString(value.abbreviation) ??
    fallbackName;

  return {
    id,
    name,
    rows: dedupeStandingRows(rows),
    children,
  };
}

function finalizeTeamStandings(standings: TeamStandings, team?: TeamConfig): TeamStandings {
  const views = buildStandingsViews(standings, team);
  const defaultView = views.some((view) => view.id === standings.defaultView)
    ? standings.defaultView
    : views[0]?.id ?? standings.defaultView;

  return {
    ...standings,
    defaultView,
    views,
  };
}

function buildStandingsViews(standings: Omit<TeamStandings, "views">, team?: TeamConfig): StandingsViewConfig[] {
  const isCollegeFootball = team?.league === "college-football";
  const definitions: Array<{ id: StandingsView; label: string; group?: StandingsGroup }> = isCollegeFootball
    ? [
        { id: "division", label: "Division", group: standings.division },
        { id: "conference", label: "Conference", group: standings.conference },
        { id: "ranking", label: "AP Top 25", group: standings.ranking },
      ]
    : [
        { id: "division", label: "Division", group: standings.division },
        { id: "conference", label: "Conference", group: standings.conference },
        { id: "league", label: "League", group: standings.league },
        { id: "ranking", label: "Ranking", group: standings.ranking },
      ];

  return definitions
    .filter((definition): definition is { id: StandingsView; label: string; group: StandingsGroup } =>
      Boolean(definition.group?.rows.length),
    )
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      group: definition.group,
    }));
}

function getDefaultStandingsView(standings: TeamStandings, team?: TeamConfig): StandingsView {
  if (team?.league === "college-football") {
    return standings.conference ? "conference" : standings.ranking ? "ranking" : "league";
  }

  if (standings.division) {
    return "division";
  }

  if (standings.conference) {
    return "conference";
  }

  return standings.league ? "league" : "ranking";
}

function findSelectedStandingsPath(group: ParsedStandingsGroup): ParsedStandingsGroup[] {
  for (const child of group.children) {
    const childPath = findSelectedStandingsPath(child);
    if (childPath.length) {
      return [group, ...childPath];
    }
  }

  if (group.rows.some((row) => row.isSelected)) {
    return [group];
  }

  return [];
}

function containsSelectedStanding(group: ParsedStandingsGroup): boolean {
  return group.rows.some((row) => row.isSelected) || group.children.some(containsSelectedStanding);
}

function getConferenceSource(
  root: ParsedStandingsGroup,
  selectedPath: ParsedStandingsGroup[],
  rootIsConference: boolean,
) {
  if (selectedPath.length >= 3) {
    return selectedPath[selectedPath.length - 2];
  }

  if (selectedPath.length === 2) {
    return rootIsConference ? root : selectedPath[1];
  }

  return selectedPath[0];
}

function isDivisionStandingsGroup(
  group: ParsedStandingsGroup,
  selectedPathLength: number,
  rootIsConference: boolean,
) {
  if (!group.rows.length) {
    return false;
  }

  return selectedPathLength >= 3 || (selectedPathLength === 2 && rootIsConference);
}

function isLikelyConferenceRoot(group: ParsedStandingsGroup) {
  const name = group.name.toLowerCase();
  const childNames = group.children.map((child) => child.name.toLowerCase());

  return (
    name.includes("conference") ||
    name === "american league" ||
    name === "national league" ||
    childNames.some((childName) =>
      childName.includes("division") ||
      childName.endsWith(" east") ||
      childName.endsWith(" central") ||
      childName.endsWith(" west") ||
      childName.endsWith(" north") ||
      childName.endsWith(" south"),
    )
  );
}

function flattenStandingsRows(groups: ParsedStandingsGroup[]): StandingsRow[] {
  return dedupeStandingRows(groups.flatMap((group) => [
    ...group.rows,
    ...flattenStandingsRows(group.children),
  ]));
}

function toStandingsGroup(group: ParsedStandingsGroup, rows: StandingsRow[]): StandingsGroup {
  return {
    id: group.id,
    name: group.name,
    rows: dedupeStandingRows(rows),
  };
}

function buildFallbackStandingsGroup(team: TeamConfig, standing: TeamStandingSummary): StandingsGroup {
  return {
    id: `${team.id}-standings-fallback`,
    name: "Standings",
    rows: [
      {
        id: `${team.id}-standing-fallback`,
        teamId: team.espnTeamId,
        teamName: team.displayName,
        record: standing.record,
        detail: standing.standing ?? "Public standings feed pending",
        isSelected: true,
      },
    ],
  };
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
  const overallRecord =
    asString(getRecord(entry.record)?.summary) ??
    getStatDisplay(stats, "total") ??
    buildRecordFromStats(stats);
  const conferenceRecord = team.league === "college-football" ? getStatDisplay(stats, "vsconf") : undefined;
  const record = conferenceRecord ?? overallRecord;
  const rank =
    getStatDisplay(stats, "rank") ?? getStatDisplay(stats, "playoffSeed") ?? getStatDisplay(stats, "divisionRank");
  const gamesBehind = getStatDisplay(stats, "gamesBehind");
  const points = getStatDisplay(stats, "points");
  const streak = getStatDisplay(stats, "streak");
  const detail = [
    overallRecord && conferenceRecord && overallRecord !== conferenceRecord ? `Overall ${overallRecord}` : undefined,
    points ? `${points} pts` : undefined,
    gamesBehind && gamesBehind !== "-" ? `${gamesBehind} GB` : undefined,
    streak,
  ]
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
    isSelected: isSelectedStandingTeam(team, providerId, abbreviation, teamName),
  };
}

function mapRankingRow(entry: unknown, team: TeamConfig): StandingsRow | null {
  if (!isRecord(entry) || !isRecord(entry.team)) {
    return null;
  }

  const teamInfo = entry.team;
  const providerId = asString(teamInfo.id);
  const abbreviation = asString(teamInfo.abbreviation);
  const teamName =
    asString(teamInfo.location) ??
    asString(teamInfo.displayName) ??
    asString(teamInfo.shortDisplayName) ??
    asString(teamInfo.name) ??
    "Team";
  const firstPlaceVotes = asString(entry.firstPlaceVotes) ?? numberToString(entry.firstPlaceVotes);
  const points = asString(entry.points) ?? numberToString(entry.points);
  const detail = [
    points ? `${points} pts` : undefined,
    firstPlaceVotes && firstPlaceVotes !== "0" ? `${firstPlaceVotes} first-place votes` : undefined,
  ]
    .filter(Boolean)
    .join(" - ") || undefined;

  return {
    id: providerId ?? `${teamName}-${asString(entry.current) ?? numberToString(entry.current) ?? "ranking"}`,
    teamId: providerId,
    rank: asString(entry.current) ?? numberToString(entry.current),
    teamName,
    record: asString(entry.recordSummary),
    detail,
    isSelected: isSelectedStandingTeam(team, providerId, abbreviation, teamName),
  };
}

function isSelectedStandingTeam(
  team: TeamConfig,
  providerId: string | undefined,
  abbreviation: string | undefined,
  teamName: string,
) {
  const normalizedTeamName = normalizeTeamIdentity(teamName);
  const normalizedDisplayName = normalizeTeamIdentity(team.displayName);
  const normalizedShortName = normalizeTeamIdentity(team.shortName);
  const normalizedNewsTerms = team.newsTerms.map(normalizeTeamIdentity).filter((term) =>
    term && !["mlb", "nhl", "nfl", "college football"].includes(term),
  );

  return (
    providerId === team.espnTeamId ||
    abbreviation?.toLowerCase() === team.espnAbbreviation.toLowerCase() ||
    normalizedTeamName === normalizedDisplayName ||
    normalizedTeamName === normalizedShortName ||
    normalizedNewsTerms.some((term) => normalizedTeamName.includes(term) || term.includes(normalizedTeamName))
  );
}

function normalizeTeamIdentity(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(football|baseball|hockey|team|club)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
