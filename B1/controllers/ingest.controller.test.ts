// Tests for the ingest controller's deduplication behavior.
//
// The controller normally talks to a real Postgres database (through Prisma) and
// to the PDF parsing library. We don't want the tests to need either, so we use
// `mock.module` to swap both out before importing the controller:
//
//   - `../lib/db`            -> a fake Prisma backed by an in-memory Map keyed by
//                              hash, which throws a `P2002` error on a repeat
//                              insert, exactly like the real unique constraint.
//   - `@cedrugs/pdf-parse`   -> a stub that returns fixed text, so no real PDF is
//                              needed.
//
// The controller still computes real SHA-256 hashes from the uploaded buffers,
// so identical buffers collide and different buffers do not, which is the whole
// point of the dedup logic. Because the mocks must be in place before the
// controller is loaded, we set them up first and then `await import(...)` it.
//
// Run with:  bun test
import { test, expect, describe, mock, beforeEach } from "bun:test";

// In-memory stand-in for the File table, keyed by the unique `hash` column.
const store = new Map<string, any>();

const fakePrisma = {
  file: {
    findUnique: async ({ where }: any) => store.get(where.hash) ?? null,
    create: async ({ data }: any) => {
      if (store.has(data.hash)) {
        const e: any = new Error("Unique constraint failed on hash");
        e.code = "P2002";
        throw e;
      }
      const row = { id: store.size + 1, ...data };
      store.set(data.hash, row);
      return row;
    },
  },
};

mock.module("../lib/db", () => ({ default: fakePrisma }));
mock.module("@cedrugs/pdf-parse", () => ({
  default: async () => ({ text: "Abstract Hello world. Introduction", info: {} }),
}));

const { ingestController } = await import("../controllers/ingest.controller");

// A minimal Express `res` that just records what the controller sent back.
function mockRes() {
  return {
    statusCode: 0,
    payload: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.payload = body;
      return this;
    },
  };
}

// Build a fake request whose "uploaded files" are buffers from the given strings.
function reqWith(...contents: string[]) {
  return { files: contents.map((c) => ({ buffer: Buffer.from(c) })) };
}

beforeEach(() => store.clear());

describe("ingestController deduplication", () => {
  test("saves two different PDFs as new records", async () => {
    const res = mockRes();
    await ingestController(reqWith("paper-A", "paper-B") as any, res as any);

    expect(res.statusCode).toBe(201);
    expect(res.payload.created).toBe(2);
    expect(res.payload.count).toBe(2);
    expect(res.payload.records.every((r: any) => r.duplicate === false)).toBe(true);
  });

  test("collapses the same file uploaded twice in one request", async () => {
    const res = mockRes();
    await ingestController(reqWith("same", "same") as any, res as any);

    expect(res.payload.created).toBe(1);
    expect(res.payload.count).toBe(2);
    expect(res.payload.records.filter((r: any) => r.duplicate).length).toBe(1);
  });

  test("returns the existing record when a known file is re-uploaded", async () => {
    const first = mockRes();
    await ingestController(reqWith("dup") as any, first as any);
    expect(first.statusCode).toBe(201);
    const firstId = first.payload.records[0].id;

    const second = mockRes();
    await ingestController(reqWith("dup") as any, second as any);
    expect(second.statusCode).toBe(200); // nothing new was created
    expect(second.payload.created).toBe(0);
    expect(second.payload.records[0].duplicate).toBe(true);
    expect(second.payload.records[0].id).toBe(firstId); // same row returned
  });

  test("rejects a request with no files", async () => {
    const res = mockRes();
    await ingestController({ files: [] } as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.payload.ok).toBe(false);
  });
});
