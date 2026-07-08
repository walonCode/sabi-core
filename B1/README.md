# PDF Ingest API

A backend service for ingesting academic research papers. A user uploads one or more PDF files, the server
reads each file, pulls out the **title, author, year, and abstract**, and saves them to a database. It also
avoids storing the same file twice: if a PDF has already been uploaded, the server returns the record that
is already on file instead of creating a duplicate.

## What it does

- Accepts one or more PDF uploads on a single request.
- Extracts basic metadata (title, author, year, abstract) from each PDF.
- Saves each paper to a PostgreSQL database.
- Detects duplicates by hashing the file contents. If the same file is uploaded again, the existing record
  is returned and the file is not parsed or stored twice.
- Returns every result with a `duplicate` flag, plus a count of how many were newly created.

## Built with

- **[Bun](https://bun.sh)** as the runtime and package manager.
- **[Express 5](https://expressjs.com/)** for the HTTP server and routing.
- **[Prisma 7](https://www.prisma.io/)** as the ORM, using the `@prisma/adapter-pg` adapter.
- **PostgreSQL** for storage (this project uses a hosted [Neon](https://neon.tech) database).
- **[Multer](https://github.com/expressjs/multer)** for handling file uploads, kept in memory rather than
  written to disk.
- **[@cedrugs/pdf-parse](https://www.npmjs.com/package/@cedrugs/pdf-parse)** for reading text out of PDFs.

## Endpoints

- `GET /` returns a simple health check.
- `POST /ingest` accepts a multipart form upload with one or more PDF files. Only PDF files are allowed and
  each file must be 10MB or smaller. It responds with the saved records, each marked as new or duplicate.

## Local setup

**Prerequisites:**

- [Bun](https://bun.sh) installed.
- A PostgreSQL database and its connection string. A free [Neon](https://neon.tech) database works well.

**1. Install dependencies**

```bash
bun install
```

**2. Set environment variables**

Create a `.env` file in the project root. Bun loads it automatically, so you do not need `dotenv`.

```bash
PORT=5000
DATABASE_URL="postgresql://user:password@host/dbname"
```

**3. Set up the database**

```bash
bun run db:migrate      # apply the database schema
bun run db:generate     # generate the Prisma client
```

**4. Run the server**

```bash
bun run dev
```

The server starts on the port from `.env` (default http://localhost:5000). You can then send PDF files to
`POST /ingest` as multipart form data.

### Scripts

| Script | What it does |
| --- | --- |
| `dev` | Runs the server with `bun --watch` and reloads on changes |
| `db:migrate` | Creates and applies database migrations with Prisma |
| `db:generate` | Regenerates the Prisma client from the schema |
| `db:studio` | Opens Prisma Studio to browse the database |

## Recommendations / next steps

The metadata extraction reads the text inside the PDF and guesses the title, author, year, and abstract.
This works, but it is fragile and often wrong because journal layouts vary a lot. Here is what can be done
to make it more reliable and more complete.

### 1. Let the user provide the metadata

Change the upload request so the user can enter the title, author, year, and abstract themselves, sent
alongside the PDF file. When those values are provided, use them directly and treat the automatic
extraction only as a fallback for anything the user leaves blank. This gives clean, correct records instead
of relying on guesswork, and it lets the user fix cases where the PDF text is messy or missing.

### 2. Store the file in an S3 bucket, not just the text

Right now only the extracted text and metadata are kept. Instead, upload the original PDF to an object
store such as an S3 bucket, and save the returned file URL in the database next to the metadata. The
database stays small and fast, the original document is always available to download or re-process later,
and you can regenerate or improve the extracted fields at any time without asking the user to upload again.

### Other worthwhile additions

- Validate the incoming data before saving, so empty or clearly wrong fields are rejected.
- Extract and store the DOI when present, since it is the most reliable way to identify a paper.
- Add tests for the upload flow and the duplicate handling.
