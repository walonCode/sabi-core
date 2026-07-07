# Study Review

A keyboard-first screening tool for systematic literature reviews. A reviewer scrolls through a set of
research studies, reads each abstract, and marks it as **Include**, **Exclude**, or flags it for
**Discussion**, all without needing the mouse. Every decision is saved to a backend, so it stays after a
page refresh.

## What it does

- Lists 50 research studies (title, authors, year, abstract) with a color-coded decision status.
- Lets a reviewer mark each study as **Include**, **Exclude**, or **Discuss**, or reset it to **Undecided**.
- Saves decisions across refreshes by writing them to a REST backend instead of `localStorage`.
- Filters by decision (All, Undecided, Included, Excluded, Discuss) with live counts. While going through
  the Undecided queue, deciding a study moves you to the next one automatically.
- Shows a progress bar in the header with one tick per study, colored by decision, so you can see how much
  of the review is done at a glance.

### Keyboard shortcuts

The whole review can be done from the keyboard:

| Key | Action |
| --- | --- |
| `↑` / `↓` (or `k` / `j`) | Move between studies |
| `Home` / `End` | Jump to first or last study |
| `i` | Mark **Include** |
| `e` | Mark **Exclude** |
| `d` | Flag for **Discuss** |
| `u` | Reset to **Undecided** |

The first navigation key focuses the current study. After that the selection follows focus, scrolls into
view, and every decision is announced to screen readers through an `aria-live` region.

## How it works

- **Frontend:** React 19 and TypeScript, built with Vite. The whole UI lives in
  [`src/App.tsx`](./src/App.tsx). Styling uses [Tailwind CSS v4](https://tailwindcss.com/) (set up in
  [`src/index.css`](./src/index.css)) with a serif font for study titles and a sans font for body text.
- **Data and persistence:** [`json-server`](https://github.com/typicode/json-server) serves
  [`src/data/mock-data.json`](./src/data/mock-data.json) as a mock REST API. The `research` array becomes
  the `http://localhost:3000/research` endpoint.
- **Reads:** on load the app calls `GET /research` using `axios`.
- **Writes:** marking a study updates the UI first, then sends `PATCH /research/:id` with the new
  `status`. If the request fails, the change is undone and an error is shown. json-server saves the change
  back to `mock-data.json`, so it persists.

> Note: json-server stores ids as strings once a record is written, so the app converts ids to numbers on
> load to keep comparisons and PATCH URLs consistent.

## Setup (local)

**Prerequisites:** Node 18+ and a package manager. This repo uses [Bun](https://bun.sh), but npm works too.

```bash
# from the F1/ directory
bun install          # or: npm install

# start the API (json-server on :3000) and the Vite dev server together
bun run dev          # or: npm run dev
```

Then open the Vite URL it prints (by default http://localhost:5173).

### Scripts

| Script | What it does |
| --- | --- |
| `dev` | Runs json-server (`:3000`) and Vite together. `Ctrl+C` stops both |
| `server` | Runs only the json-server API on `:3000` |
| `app` | Runs only the Vite dev server |
| `build` | Type-checks (`tsc -b`) and builds for production |
| `lint` | Runs ESLint |
| `preview` | Serves the production build locally |

If study decisions ever stop saving, make sure the API on `:3000` is running (`bun run server`).

## Recommendations / next steps

json-server is good for a demo, but it reads and writes a single JSON file. It has no real concurrency, no
validation, no auth, and it does not scale. Here is what can be done to take this toward production.

### 1. Use a real database

Replace the JSON file with a managed Postgres database such as [Neon](https://neon.tech), and use
[Drizzle ORM](https://orm.drizzle.team) to talk to it. Drizzle gives you type-safe queries and a clear way
to define the studies table (title, authors, year, abstract, status) and to run migrations when the shape
of the data changes. Neon provides a hosted connection string, so there is no database to install or run
yourself.

### 2. Add a real API server

Put a small API server (for example [Hono](https://hono.dev), Express, or Fastify) in front of the
database, so the app talks to real endpoints instead of json-server. It would offer three things:

- List all studies.
- Submit a new study, so a user can add their own research to the review queue.
- Update a study's decision status.

The submit endpoint should check the incoming data before saving it (a valid title, authors, year, and
abstract). On the frontend this means keeping the same read and update calls, just pointing them at the new
server, and adding a small form where a user can post new research.

### Other worthwhile additions

- Input validation on the server, with the same rules shared by the frontend.
- Auth and per-reviewer decisions, so two reviewers can screen independently and disagreements show up.
- Notes per study, plus a record of who decided what and when.
- Tests for the decision and keyboard logic, and for the API routes.
