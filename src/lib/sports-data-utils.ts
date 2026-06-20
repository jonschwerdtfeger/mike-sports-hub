export function getArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function numberToString(value: unknown): string | undefined {
  return typeof value === "number" ? String(value) : undefined;
}

export function buildRecordFromStats(stats: unknown[] | undefined): string | undefined {
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

export function getStatDisplay(stats: unknown[] | undefined, name: string): string | undefined {
  const stat = stats
    ?.filter(isRecord)
    .find((item) => asString(item.name) === name || asString(item.abbreviation) === name);

  return asString(stat?.displayValue) ?? numberToString(stat?.value);
}
