"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { TeamSpotlightPanel } from "@/components/team-spotlight/team-spotlight-panel";
import { formatGameTitle, formatLastResult } from "@/lib/sports-format";
import type { TeamSpotlight } from "@/lib/sports-data";

type TeamSpotlightDockProps = {
  spotlights: TeamSpotlight[];
};

export function TeamSpotlightDock({ spotlights }: TeamSpotlightDockProps) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeSpotlight = spotlights.find((spotlight) => spotlight.team.id === activeTeamId);

  const closeDrawer = useCallback(() => {
    const teamId = activeTeamId;
    setActiveTeamId(null);
    window.setTimeout(() => {
      if (teamId) {
        buttonRefs.current[teamId]?.focus();
      }
    }, 0);
  }, [activeTeamId]);

  useEffect(() => {
    if (!activeSpotlight) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSpotlight, closeDrawer]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {spotlights.map((spotlight) => (
          <button
            key={spotlight.team.id}
            ref={(element) => {
              buttonRefs.current[spotlight.team.id] = element;
            }}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={activeTeamId === spotlight.team.id}
            onClick={() => setActiveTeamId(spotlight.team.id)}
            className="group relative min-h-44 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-strong)]"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: spotlight.team.primaryColor }} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {spotlight.team.league.replace("-", " ")}
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">{spotlight.team.shortName}</h2>
                <p className="mt-1 truncate text-xs font-medium text-[var(--text-muted)]">
                  {spotlight.standing.label ?? spotlight.status.statusLabel}
                </p>
              </div>
              <Image
                src={spotlight.team.logoUrl}
                alt={`${spotlight.team.displayName} logo`}
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
              />
            </div>

            <div className="mt-4 grid gap-2">
              <TeamCardLine label="Status" value={spotlight.status.statusLabel} />
              <TeamCardLine label="Last" value={formatLastResult(spotlight.lastGames[0])} />
              <TeamCardLine label="Next" value={spotlight.status.nextGame ? formatGameTitle(spotlight.status.nextGame) : "Schedule pending"} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {spotlight.lastGames.length} recent / {spotlight.nextGames.length} upcoming
              </span>
              <span className="text-xs font-black uppercase tracking-[0.1em] text-[var(--text)] group-hover:text-[var(--text-muted)]">
                Open
              </span>
            </div>
          </button>
        ))}
      </div>

      {activeSpotlight ? (
        <div
          className="fixed inset-0 z-50 bg-black/45"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDrawer();
            }
          }}
        >
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-spotlight-title"
            className="fixed inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:h-screen lg:max-h-none lg:w-[480px] lg:rounded-l-md lg:rounded-tr-none"
          >
            <TeamSpotlightPanel spotlight={activeSpotlight} closeButtonRef={closeButtonRef} onClose={closeDrawer} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function TeamCardLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 text-xs">
      <span className="font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">{label}</span>
      <span className="truncate font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}
