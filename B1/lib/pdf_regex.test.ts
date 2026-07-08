// Tests for the PDF metadata extractor.
//
// `extractAcademicSchema` is a pure function: same input always gives the same
// output, and it touches nothing external (no database, no network, no files).
// That makes it the easiest and most valuable thing to unit test. Each test
// below feeds it a small `fullText` string and an `info` object (the two things
// the real PDF parser hands over) and asserts on the returned fields.
//
// Run with:  bun test
import { test, expect, describe } from "bun:test";
import extractAcademicSchema from "./pdf_regex";

describe("extractAcademicSchema", () => {
  test("uses the embedded PDF metadata when it is present", () => {
    const out = extractAcademicSchema("some body text", {
      Title: "Neural Networks",
      Author: "A. Smith",
    });
    expect(out.title).toBe("Neural Networks");
    expect(out.author).toBe("A. Smith");
  });

  test("falls back to the first line of text when there is no title", () => {
    const out = extractAcademicSchema("Actual Paper Title\nfollowed by the body", {});
    expect(out.title).toBe("Actual Paper Title");
    expect(out.author).toBe("Unknown Author");
  });

  test("ignores a filename-looking title and uses the first line instead", () => {
    const out = extractAcademicSchema("Actual Paper Title\nbody", { Title: "document.PDF" });
    expect(out.title).toBe("Actual Paper Title");
  });

  test("reads the year from the PDF creation date", () => {
    const out = extractAcademicSchema("body", { CreationDate: "D:20211015093000" });
    expect(out.year).toBe("2021");
  });

  test("falls back to scanning the text for a 4-digit year", () => {
    const out = extractAcademicSchema("Published 2018 in a journal", {});
    expect(out.year).toBe("2018");
  });

  test("reports an unknown year when none can be found", () => {
    const out = extractAcademicSchema("no dates in here", {});
    expect(out.year).toBe("Unknown Year");
  });

  test("captures the abstract and stops at the next section", () => {
    const out = extractAcademicSchema("Abstract This is the summary. Introduction and more.", {});
    expect(out.abstract).toBe("This is the summary.");
  });

  test("reports when no abstract section is found", () => {
    const out = extractAcademicSchema("just a title and body, nothing labelled", {});
    expect(out.abstract).toBe("No abstract section identified");
  });

  test("handles completely empty input without throwing", () => {
    const out = extractAcademicSchema("", {});
    expect(out.title).toBe("Unknown Title");
    expect(out.author).toBe("Unknown Author");
    expect(out.year).toBe("Unknown Year");
    expect(out.abstract).toBe("No abstract section identified");
  });
});
