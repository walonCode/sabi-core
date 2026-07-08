import logger from "./lib/logger";
import openai from "./lib/openai";

export type ScreeningDecision = "include" | "exclude" | "uncertain";

export interface ScreeningResult {
  decision: ScreeningDecision;
  reason: string;
}

const SYSTEM_PROMPT = `
You are a screening assistant for a systematic literature review.
You are given a study's abstract and a list of screening criteria, and you
decide whether the study should be included, excluded, or is uncertain.

Judge ONLY from the abstract and the criteria below. Do not rely on outside
knowledge and do not assume facts the abstract does not state.

How to decide:
- "include": the abstract clearly meets all of the criteria.
- "exclude": the abstract clearly fails at least one criterion.
- "uncertain": the abstract does not give enough information to judge one or
  more criteria.

Be conservative. When the abstract lacks the information needed to check a
criterion, choose "uncertain" instead of guessing.

Return a "reason" of exactly one short sentence that names the deciding
criterion. Do not add anything beyond the requested fields.
`.trim();

export async function researchAi(
  abstract: string,
  criteria: string[],
): Promise<ScreeningResult> {
  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const userPrompt = `Abstract:\n${abstract}\n\nCriteria:\n${criteriaList}`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-oss-20b:free",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "screening_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              enum: ["include", "exclude", "uncertain"],
              description: "Whether the study should be included, excluded, or is uncertain.",
            },
            reason: {
              type: "string",
              description: "One short sentence justifying the decision.",
            },
          },
          required: ["decision", "reason"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The model returned an empty response.");
  }

  //loging the model name, version and userPrompt
  await logger("free", "openai/gpt-oss-20b:free", SYSTEM_PROMPT)

  return JSON.parse(content) as ScreeningResult;
}

// Small demo when running `bun index.ts` directly; skipped when imported.
if (import.meta.main) {
  const criteria = [
    "Study must be a randomized controlled trial",
    "Participants must be adults aged 18 or older",
    "Intervention must be digital or app-based",
  ];

  const cases = [
    {
      label: "Expected: include",
      abstract:
        "This randomized controlled trial evaluated a smartphone app delivering cognitive behavioral therapy to 200 adults aged 25 to 60 with insomnia over an 8-week period, showing significant improvement versus a waitlist control.",
    },
    {
      label: "Expected: exclude",
      abstract:
        "This systematic review summarizes pharmacological treatments for hypertension in older adults, pooling results from previously published drug trials.",
    },
    {
      label: "Expected: uncertain",
      abstract:
        "This study tested a new mobile wellness app among participants over several weeks and reported improved mood, but does not describe the study design or the participants' ages.",
    },
  ];

  for (const c of cases) {
    try {
      const result = await researchAi(c.abstract, criteria);
      console.log(`\n${c.label}`);
      console.log(result);
    } catch (err) {
      console.error(`\n${c.label} -> failed:`, err instanceof Error ? err.message : err);
    }
  }
}