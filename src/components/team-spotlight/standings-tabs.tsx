"use client";

import { useState } from "react";
import type { StandingsGroup, StandingsView, TeamStandings } from "@/lib/sports-data";

export function StandingsTabs({ standings }: { standings: TeamStandings }) {
  const availableViews = standings.views;
  const initialView = availableViews.some((view) => view.id === standings.defaultView)
    ? standings.defaultView
    : availableViews[0]?.id;
  const [activeView, setActiveView] = useState<StandingsView | undefined>(initialView);
  const activeConfig = availableViews.find((view) => view.id === activeView) ?? availableViews[0];
  const activeGroup = activeConfig?.group;

  if (!activeGroup) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
        Standings feed pending.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {availableViews.length > 1 ? (
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {availableViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`min-w-0 flex-1 rounded px-2 py-1.5 text-xs font-black uppercase tracking-[0.1em] transition ${
                activeConfig?.id === view.id
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
              }`}
            >
              <span className="block truncate">{view.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <StandingsList group={activeGroup} />
    </div>
  );
}

function StandingsList({ group }: { group: StandingsGroup }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
        <p className="truncate text-xs font-black uppercase tracking-[0.1em] text-[var(--text)]" title={group.name}>
          {group.name}
        </p>
      </div>
      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--text-soft)]">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">Record</span>
      </div>
      {group.rows.map((row) => (
        <div
          key={row.id}
          className={`grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 border-b border-[var(--border)] p-3 text-sm last:border-b-0 ${
            row.isSelected ? "bg-[var(--surface-muted)]" : "bg-[var(--surface)]"
          }`}
        >
          <div className="font-semibold text-[var(--text-muted)]">{row.rank ?? "-"}</div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--text)]">{row.teamName}</p>
            <p className="text-xs text-[var(--text-soft)]">{row.detail ?? row.streak ?? "Standing detail pending"}</p>
          </div>
          <div className="text-right font-semibold text-[var(--text)]">{row.record ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}
