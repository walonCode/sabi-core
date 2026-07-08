# Sabi Core Take-Home

This repository contains my answers to the Sabi Core take-home assessment. I answered one question from
each of the three tracks:

| Track | Question | Folder | Summary |
| --- | --- | --- | --- |
| 1 (Frontend) | **F1** | [`/F1`](./F1) | A keyboard-first study screener where a reviewer marks each study include, exclude, or discuss |
| 2 (Backend) | **B1** | [`/B1`](./B1) | A PDF ingestion endpoint that extracts metadata, stores it, and avoids duplicates |
| 3 (AI) | **A1** | [`/A1`](./A1) | A function that screens an abstract against criteria and returns include / exclude / uncertain with a reason |

Each folder has its own README with more detail and mock data is labelled as mock.

## A note on the stack

I built these with **[Bun](https://bun.sh)** as the package manager and task runner rather than plain npm.
Node 18+ still works as the runtime, but the scripts call `bun` and `bunx`, so please install Bun first. The
F1 frontend still runs under Vite as required.

A few other choices differ from the brief, and are explained in each folder's README:

- **F1** persists decisions to a local `json-server` REST API instead of `localStorage`.
- **A1** uses the OpenAI SDK pointed at [OpenRouter](https://openrouter.ai) instead of calling OpenAI directly.

## F1: Study screener (frontend)

A React and Vite interface for screening 50 research studies. The reviewer can move through studies and
decide on them entirely with the keyboard, and decisions are saved to a `json-server` backend so they
survive a refresh. Mock data lives in `F1/src/data/mock-data.json`.

```bash
cd F1
bun install
bun run dev
```

`bun run dev` starts the `json-server` API on port 3000 and Vite together. Open the Vite URL it prints
(default http://localhost:5173).

## B1: Document ingestion (backend)

An Express and Prisma endpoint. `POST /ingest` accepts one or more PDF uploads, extracts the title,
author, year, and abstract, and stores each in PostgreSQL. It hashes the file contents to detect duplicates,
returning the existing record instead of storing the same file twice.

Requires a PostgreSQL database (I used [Neon](https://neon.tech)).

```bash
cd B1
bun install

cp .env.example .env   # then set DATABASE_URL

bun run db:migrate     # apply the database schema
bun run db:generate    # generate the Prisma client
bun run dev            # server on http://localhost:4000 (from .env.example)

bun test               # run the tests
```

## A1: Abstract screening assistant (AI)

A function, `researchAi(abstract, criteria)`, that asks a language model to decide whether a study should
be included, excluded, or is uncertain, and returns a one sentence reason. It judges only from the abstract
and the given criteria, and logs the model name, version, and prompt for every call to
`A1/logs/ai_response.log`.

Requires an [OpenRouter](https://openrouter.ai) API key.

```bash
cd A1
bun install

cp .env.example .env    # then set OPENROUTER_API_KEY

bun run dev             # runs a demo with three abstracts (include, exclude, uncertain)
```
