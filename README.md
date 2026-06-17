# Michael SportsHub

A personalized sports dashboard for Michael, tracking:

- Philadelphia Phillies
- Tampa Bay Lightning
- New England Patriots
- Florida Gators football

The app is built with Next.js App Router, TypeScript, and Tailwind CSS. It uses typed server-side provider functions for scores, schedules, news, and transaction-related headlines. MCP/browser tooling is useful during development and verification, but it is not part of the deployed runtime.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```

## Data Model

Michael's personalization lives in `src/config/profile.ts`. Each team has display metadata, colors, ESPN provider references, logo URL, and news query terms.

The server-side data functions live in `src/lib/sports-data.ts`:

- `getTeamStatus(team)`
- `getSchedule(team)`
- `getNews(team)`
- `getTransactionHeadlines(team)`

The dashboard degrades gracefully when public sports/news feeds are unavailable.

## Deployment

Deploy with Vercel's Git integration. No API keys are required for v1. If paid providers are added later, store keys in Vercel environment variables and keep provider calls server-side.
