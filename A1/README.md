# Research Screening AI (a1)

An AI helper for screening research studies. Given a study's abstract and a list of screening criteria, it
asks a language model to decide whether the study should be **included**, **excluded**, or is **uncertain**,
and returns a one sentence reason for the decision. It is meant to support a systematic literature review by
giving a fast first pass over abstracts.

## How it works

The core is a single function, `researchAi(abstract, criteria)`:

1. It builds a prompt. The instructions go in a system message, and the abstract plus the numbered criteria
   go in a user message.
2. It sends the request to a model through [OpenRouter](https://openrouter.ai) using the OpenAI SDK, with a
   strict JSON schema. The model can only reply in this shape:

   ```json
   { "decision": "include | exclude | uncertain", "reason": "one short sentence" }
   ```

3. It uses `temperature: 0` so the same abstract and criteria give a consistent decision.
4. It parses the reply and returns it as a typed `ScreeningResult`. If the model returns nothing, it throws
   instead of returning an empty value.
5. Every call is logged (timestamp, model name, version, and prompt) to `logs/ai_response.log`.

The model is instructed to judge only from the abstract and the criteria, and to choose `uncertain` when the
abstract does not contain enough information, rather than guessing.

Running the file directly with `bun index.ts` runs a small demo with three example abstracts, one for each
possible decision (include, exclude, and uncertain). Importing the file does not run the demo, so you can use
`researchAi` from other code.

## Built with

- **[Bun](https://bun.sh)** as the runtime and package manager.
- **[OpenAI SDK](https://github.com/openai/openai-node)** pointed at the OpenRouter API.
- **OpenRouter** model `openai/gpt-oss-20b:free`.

## Setup

**Prerequisites:**

- [Bun](https://bun.sh) installed.
- An [OpenRouter](https://openrouter.ai) API key.

**1. Install dependencies**

```bash
bun install
```

**2. Set environment variables**

Create a `.env` file in the project root. Bun loads it automatically, so you do not need `dotenv`.

```bash
OPENROUTER_API_KEY="your-openrouter-key"
```

**3. Run the demo**

```bash
bun run dev
```

This runs the three example abstracts and prints the decision and reason for each. To use it in your own
code, import the function instead:

```ts
import { researchAi } from "./index";

const result = await researchAi(abstract, criteria);
```

### Scripts

| Script | What it does |
| --- | --- |
| `dev` | Runs the demo in `index.ts` |
