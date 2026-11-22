# services/

External API integrations live here — one file per provider
(for example `cashfree.ts`, `sarvam.ts`, `llm.ts`). Empty on purpose until the buildathon.

Rules:

1. Start every service file with `import "server-only";` so it can never be bundled for the browser.
2. Read secrets with `requireServerEnv("KEY")` from `@/lib/env` **inside** the function that uses them, not at the top of the file. The app then starts even when an integration isn't configured.
3. Validate external responses with Zod before returning them.
4. Route Handlers call services; components never call external APIs directly.

```ts
import "server-only";
import { requireServerEnv } from "@/lib/env";

export async function exampleCall() {
  const apiKey = requireServerEnv("LLM_API_KEY");
  // fetch(...) with apiKey
}
```
