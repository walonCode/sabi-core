import PdfParse from "@cedrugs/pdf-parse";
import type { Request, Response } from "express";
import extractAcademicSchema from "../lib/pdf_regex";
import prisma from "../lib/db";

type FileRecord = Awaited<ReturnType<typeof prisma.file.create>>;

export async function ingestController(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        "ok": false,
        "error":"no files uploaded"
      })
      return
    }

    const results: { record: FileRecord, duplicate: boolean }[] = [];
    // Track hashes handled in this request so the same file uploaded twice
    // in one batch collapses to a single record.
    const seen = new Map<string, FileRecord>();

    for (const file of files) {
      const hash = new Bun.CryptoHasher("sha256").update(file.buffer).digest("hex")

      const alreadyInBatch = seen.get(hash)
      if (alreadyInBatch) {
        results.push({ record: alreadyInBatch, duplicate: true })
        continue
      }

      // Already on record: return the existing row, skip re-parsing.
      const existing = await prisma.file.findUnique({ where: { hash } })
      if (existing) {
        seen.set(hash, existing)
        results.push({ record: existing, duplicate: true })
        continue
      }

      const parsed = await PdfParse(file.buffer)
      const {title, author, year, abstract } = extractAcademicSchema(parsed.text, parsed.info)
      const parsedYear = Number(year)

      try {
        const created = await prisma.file.create({
          data: {
            title,
            author,
            year: Number.isNaN(parsedYear) ? 0 : parsedYear,
            abstract,
            hash
          }
        })
        seen.set(hash, created)
        results.push({ record: created, duplicate: false })
      } catch (err) {
        // A concurrent request inserted the same file between our check and create.
        if ((err as { code?: string }).code === "P2002") {
          const winner = await prisma.file.findUnique({ where: { hash } })
          if (!winner) throw err
          seen.set(hash, winner)
          results.push({ record: winner, duplicate: true })
        } else {
          throw err
        }
      }
    }

    const createdCount = results.filter(r => !r.duplicate).length

    res.status(createdCount > 0 ? 201 : 200).json({
      "ok": true,
      "message":`${createdCount} ingested, ${results.length - createdCount} duplicate(s)`,
      "count": results.length,
      "created": createdCount,
      "records": results.map(r => ({ ...r.record, duplicate: r.duplicate }))
    })
  } catch (err) {
    if (Bun.env.NODE_ENV === "development") console.log(err)
    res.status(500).json({
      "ok": false,
      "error":"something went wrong"
    })
  }
}
