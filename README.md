# Lumen - AI Application Analysis (Mockups)

Front-end-only, mock-data-driven prototype of an AI-powered application analysis platform. The AI "explores" an app, builds an interactive **application map**, generates and runs test scenarios, and surfaces insights and issues.

> No backend. All data is static/simulated and lives in [`src/data/mockData.ts`](src/data/mockData.ts). The example app under analysis is a fictional e-commerce app, **ShopFlow**.

## Stack

- Vite + React + TypeScript
- Tailwind CSS (light, minimal theme with status colors)
- React Router (navigation)
- [`@xyflow/react`](https://reactflow.dev) (React Flow) for the interactive map
- `lucide-react` (icons)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Screens & routes

| Route | Screen |
| --- | --- |
| `/` | Dashboard (summary metrics, coverage, top issues) |
| `/exploration` | AI Exploration progress (simulated live crawl + activity log) |
| `/map` | Application Map (interactive graph - the centerpiece) |
| `/screens/:id` | Screen Details |
| `/journeys`, `/journeys/:id` | User Journeys list + detail |
| `/tests`, `/tests/:id` | Test Scenarios list + detail |
| `/insights` | AI Insights (grouped by category) |
| `/issues/:id` | Issue Details |

## Interactions

- **Application Map**: click a node to preview a screen, double-click (or "Open full details") to open Screen Details, and use the "Highlight journey" selector to trace a flow.
- **Role switcher** (top bar): QA / Developer / Product Owner - adjusts emphasis on the Dashboard and default test filter.
- **Cross-linking**: screens link to their tests and issues; insights link to issues; issues link back to screens, journeys, and tests.

## Status colors

Green = passed/healthy - Yellow = warning - Red = failed/broken - Blue = AI recommendation.

## Structure

```
src/
  components/   # Layout, Sidebar, TopBar, cards, badges, ScreenNode
  context/      # RoleContext (role switcher)
  data/         # mockData.ts + helpers.ts (lookups, labels)
  pages/        # one component per route
  types/        # shared TypeScript types
```
