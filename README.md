# Lumen - AI Application Analysis

React prototype of an AI-powered application analysis platform. The AI "explores" an app, builds an interactive **application map**, generates and runs test scenarios, and surfaces insights and issues.

Data is stored in **Supabase** (Postgres) when configured, with a local mock fallback for development without credentials. The example app under analysis is a fictional e-commerce app, **ShopFlow**.

## Stack

- Vite + React + TypeScript
- Tailwind CSS (light, minimal theme with status colors)
- React Router (navigation)
- [`@xyflow/react`](https://reactflow.dev) (React Flow) for the interactive map
- Supabase (`@supabase/supabase-js`) + TanStack Query for data
- `lucide-react` (icons)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Without Supabase env vars, the app runs in **mock fallback mode** (data from `src/data/mockData.ts`).

## Supabase setup (free tier)

1. Create a project at [supabase.com](https://supabase.com) (GitHub sign-in is fine).
2. In **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
3. Create `.env.local` from the example:

```bash
cp .env.example .env.local
# edit .env.local with your values
```

4. In the Supabase **SQL Editor**, run [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql).
5. Seed the ShopFlow demo dataset:

```bash
npm run db:seed
```

6. Restart `npm run dev` and verify data in the Supabase **Table Editor**.

### Write operations

When Supabase is configured:

- **Issue details** — change issue status (open / acknowledged / resolved)
- **Start Analysis** — creates a new empty analysis row and switches to it
- **Test details** — Re-run resets test status to `not-executed`

RLS policies are open for the `anon` role (hackathon demo only — not production-safe).

## Screens & routes

| Route | Screen |
| --- | --- |
| `/` | Application Map (interactive graph) |
| `/dashboard` | Dashboard (summary metrics, coverage, top issues) |
| `/start` | Start new analysis |
| `/exploring` | Live exploration animation |
| `/exploration` | AI Exploration progress (simulated crawl + activity log) |
| `/screens/:id` | Screen Details |
| `/journeys`, `/journeys/:id` | User Journeys list + detail |
| `/tests`, `/tests/:id` | Test Scenarios list + detail |
| `/insights` | AI Insights (grouped by category) |
| `/issues/:id` | Issue Details |

## Structure

```
src/
  components/   # Layout, Sidebar, cards, investigation UI
  context/      # RoleContext, AnalysisContext, AnalysisDataContext
  data/         # mockData.ts (seed source + fallback), helpers.ts
  hooks/        # Supabase mutations
  lib/          # supabase client, API, DB mappers
  pages/        # one component per route
  types/        # shared TypeScript types
supabase/
  migrations/   # SQL schema
scripts/
  seed-database.mjs
```

## Status colors

Green = passed/healthy - Yellow = warning - Red = failed/broken - Blue = AI recommendation.
