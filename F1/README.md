# Study Review

A keyboard-first screening tool for systematic literature reviews. A reviewer scrolls through a set of
research studies, reads each abstract, and triages it as **Include**, **Exclude**, or **flag for
Discussion** — without ever needing the mouse. Every decision is saved to a backend, so it survives a
page refresh.

## What it does

- Lists 50 research studies (title, authors, year, abstract) with a color-coded decision status.
- Lets a reviewer mark each study **Include** / **Exclude** / **Discuss**, or reset it to **Undecided**.
- **Persists decisions** across refreshes by writing them to a REST backend (not `localStorage`).
- **Filters** by decision (All / Undecided / Included / Excluded / Discuss) with live counts. While
  triaging the *Undecided* queue, deciding a study auto-advances to the next one.
- Shows a **progress spine** in the header — one tick per study, colored by decision — for an at-a-glance
  overview of how much of the review is done.

### Keyboard shortcuts

The whole review can be driven from the keyboard:

| Key | Action |
| --- | --- |
| `↑` / `↓` (or `k` / `j`) | Move between studies |
| `Home` / `End` | Jump to first / last study |
| `i` | Mark **Include** |
| `e` | Mark **Exclude** |
| `d` | Flag for **Discuss** |
| `u` | Reset to **Undecided** |

The first navigation key focuses the current study; after that the selection follows focus, scrolls into
view, and every decision is announced to screen readers via an `aria-live` region.

## How it works

- **Frontend:** React 19 + TypeScript, built with Vite. The entire UI lives in
  [`src/App.tsx`](./src/App.tsx). Styling is [Tailwind CSS v4](https://tailwindcss.com/) (configured in
  [`src/index.css`](./src/index.css)) with a serif display face for study titles and a sans body face.
- **Data / persistence:** [`json-server`](https://github.com/typicode/json-server) serves
  [`src/data/mock-data.json`](./src/data/mock-data.json) as a mock REST API. The `research` array becomes
  the `http://localhost:3000/research` endpoint.
- **Reads:** on load the app does `GET /research` (via `axios`).
- **Writes:** marking a study does an **optimistic** update in the UI, then `PATCH /research/:id` with the
  new `status`. If the request fails, the change is rolled back and an error is shown. json-server writes
  the change back to `mock-data.json`, so it persists.

> Note: json-server stores ids as strings once a record is written, so the app normalizes ids to numbers
> on load to keep comparisons and PATCH URLs consistent.

## Setup (local)

**Prerequisites:** Node 18+ and a package manager (this repo uses [Bun](https://bun.sh); npm works too).

```bash
# from the F1/ directory
bun install          # or: npm install

# start the API (json-server on :3000) and the Vite dev server together
bun run dev          # or: npm run dev
```

Then open the Vite URL it prints (default http://localhost:5173).

### Scripts

| Script | What it does |
| --- | --- |
| `dev` | Runs json-server (`:3000`) **and** Vite together; `Ctrl+C` stops both |
| `server` | Runs only the json-server API on `:3000` |
| `app` | Runs only the Vite dev server |
| `build` | Type-checks (`tsc -b`) and builds for production |
| `lint` | Runs ESLint |
| `preview` | Serves the production build locally |

If study decisions ever stop saving, make sure the API on `:3000` is running (`bun run server`).

## Recommendations / next steps

json-server is great for a demo, but it reads and writes a single JSON file — no real concurrency, no
validation, no auth, and it doesn't scale. To take this toward production:

### 1. A real database — Neon + Drizzle

Swap the JSON file for a managed Postgres database like [Neon](https://neon.tech) and access it with
[Drizzle ORM](https://orm.drizzle.team) for type-safe queries and migrations.

```ts
// db/schema.ts
import { pgTable, serial, text, integer, pgEnum } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["include", "exclude", "discussion", "undecided"]);

export const research = pgTable("research", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  year: integer("year").notNull(),
  abstract: text("abstract").notNull(),
  status: statusEnum("status").notNull().default("undecided"),
});
```

Drizzle Kit generates and applies migrations (`drizzle-kit generate` / `migrate`), and Neon gives you a
serverless Postgres connection string you can drop straight into `DATABASE_URL`.

### 2. A proper API server (with `POST` to submit research)

Put a small API server (e.g. [Hono](https://hono.dev), Express, or Fastify) in front of the database so
the client talks to real endpoints instead of json-server:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/research` | List studies |
| `POST` | `/research` | **Submit a new study** (validated title, authors, year, abstract) |
| `PATCH` | `/research/:id` | Update a study's decision status |

```ts
// example: Hono + Drizzle + Zod validation
app.post("/research", async (c) => {
  const body = await c.req.json();
  const parsed = studySchema.parse(body);            // validate with Zod
  const [created] = await db.insert(research).values(parsed).returning();
  return c.json(created, 201);
});
```

With that in place, the frontend keeps the same `GET`/`PATCH` calls (just repoint the base URL) and gains
a submission form that `POST`s new research into the review queue.

### Other worthwhile additions

- **Validation** on the server with [Zod](https://zod.dev), sharing types with the frontend.
- **Auth + per-reviewer decisions** so two reviewers can screen independently and disagreements surface.
- **Notes per study** and an audit trail of who decided what and when.
- **Tests** for the decision/keyboard logic (Vitest + Testing Library) and API routes.
