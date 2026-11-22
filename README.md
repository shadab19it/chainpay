# Buildathon Starter

A clean, minimal **Next.js (App Router) + TypeScript + Tailwind CSS** foundation for a one-day buildathon.
It has no product features yet — those get built on the day.

| Tool | Version |
| --- | --- |
| Next.js (App Router, Turbopack) | 16.4 |
| React | 19.3 |
| TypeScript (strict) | 5.x |
| Tailwind CSS | 4.3 |
| Zod | 4.x |
| Lucide React | icons |
| ESLint | 9 (flat config, `eslint-config-next`) |

---

## 1. Requirements

- **Node.js 20.9 or newer** (22 recommended — see `.nvmrc`). Check with `node -v`.
- npm (comes with Node).
- Git.

## 2. Setup (fresh clone)

```bash
git clone <repo-url>
cd buildathon-starter
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The app starts **even if every value in `.env.local` is empty**.

## 3. Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (hot reload) at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production build (after `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + run `tsc --noEmit` |
| `npm run check` | Lint + typecheck. **Run before every push.** |

## 4. Folder structure

```
src/
├── app/                      # Routes (App Router)
│   ├── api/
│   │   └── health/route.ts   # GET /api/health
│   ├── layout.tsx            # Root layout: fonts, metadata, AppShell
│   ├── page.tsx              # Home page (placeholder — replace it)
│   ├── loading.tsx           # Route-level loading UI
│   ├── error.tsx             # Route-level error UI
│   ├── global-error.tsx      # Errors in the root layout itself
│   ├── not-found.tsx         # 404 page
│   └── globals.css           # Tailwind + design tokens (colors)
├── components/
│   ├── ui/                   # Small generic building blocks (Button)
│   └── shared/               # Reusable app pieces (AppShell, LoadingState, ErrorState)
├── hooks/                    # Custom React hooks (useSomething.ts)
├── lib/
│   ├── api.ts                # API response helpers (server only)
│   ├── env.ts                # Validated environment variables (server only)
│   ├── constants.ts          # App-wide constants (safe for client)
│   └── utils.ts              # cn() and small helpers
├── services/                 # External API integrations, one file per provider (server only)
├── types/
│   └── api.ts                # Shared API response types
└── instrumentation.ts        # Validates env vars once at server startup
public/                       # Static files served at /
```

**Where does new code go?**

- A new page → `src/app/<route>/page.tsx`
- A new API endpoint → `src/app/api/<name>/route.ts`
- A call to Cashfree / Sarvam / an LLM → `src/services/<provider>.ts`, called from a Route Handler
- A reusable piece of UI → `src/components/shared/`
- Shared TypeScript types → `src/types/`

**Naming:** files and folders in `kebab-case` (`error-state.tsx`), components in `PascalCase` (`ErrorState`), hooks start with `use` (`use-debounce.ts` → `useDebounce`), constants in `UPPER_SNAKE_CASE`.

## 5. Environment variables

All variables are listed in `.env.example`. Copy it to `.env.local` and fill in what you need.

| Variable | Exposed to browser? | Required at startup? |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | No (defaults to `http://localhost:3000`) |
| `DATABASE_URL` | No | No |
| `CASHFREE_CLIENT_ID` | No | No |
| `CASHFREE_CLIENT_SECRET` | No | No |
| `CASHFREE_ENV` | No | No (defaults to `sandbox`; must be `sandbox` or `production`) |
| `SARVAM_API_KEY` | No | No |
| `LLM_API_KEY` | No | No |

Rules:

- **Only `NEXT_PUBLIC_*` variables reach the browser.** Never prefix a secret with `NEXT_PUBLIC_`.
- `.env.local` is git-ignored. Never commit it. Share keys with teammates privately.
- Read server variables through `src/lib/env.ts`, never `process.env` directly:

  ```ts
  import { requireServerEnv, hasServerEnv } from "@/lib/env";

  const key = requireServerEnv("SARVAM_API_KEY"); // throws a clear error if missing
  if (hasServerEnv("LLM_API_KEY")) { /* ... */ }
  ```

- `src/lib/env.ts` imports `server-only`, so **the build fails if a Client Component imports it**. Secrets can't leak to the browser by accident.
- Values are validated with Zod when the server starts. A malformed value (e.g. `CASHFREE_ENV=prod`) stops the server with a clear message. Missing integration keys only error when that integration is used.
- Restart `npm run dev` after editing `.env.local`.

## 6. API conventions

Every endpoint returns the same shape (`src/types/api.ts`):

```jsonc
// success
{ "success": true, "message": "OK", "data": { /* optional */ }, "timestamp": "2026-11-21T09:00:00.000Z" }

// error
{ "success": false, "message": "Invalid request data", "error": { "code": "VALIDATION_ERROR", "details": {} }, "timestamp": "..." }
```

Template for a new endpoint, with Zod validation:

```ts
// src/app/api/example/route.ts
import { z } from "zod";
import { apiSuccess, handleApiError, parseJsonBody } from "@/lib/api";

const bodySchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, bodySchema); // invalid input -> 400
    return apiSuccess({ data: { name: body.name }, status: 201 });
  } catch (error) {
    return handleApiError(error); // Zod -> 400, HttpError -> its status, anything else -> 500
  }
}
```

To return a specific error from anywhere in a handler: `throw new HttpError(404, "Not found", "NOT_FOUND")`.

> **Cache Components is on** (`cacheComponents: true` in `next.config.ts`, the Next 16 default). Nothing is cached unless you add `"use cache"`. If a `GET` handler uses `new Date()`, `Math.random()` or `crypto.randomUUID()` without reading the request, call `await connection()` (from `next/server`) first, as `/api/health` does — otherwise the build fails. Handlers that read `request` (body, headers, URL) are already request-time.

## 7. Test the health endpoint

With `npm run dev` running:

```bash
curl http://localhost:3000/api/health
```

Expected:

```json
{"success":true,"message":"Service is healthy","timestamp":"2026-11-21T09:00:00.000Z"}
```

Or click **Check API health** on the home page.

## 8. Git workflow

Keep `main` always runnable.

```bash
# 1. Start from the latest main
git checkout main
git pull

# 2. Create a short-lived branch per feature
git checkout -b feat/short-name        # or fix/..., chore/...

# 3. Commit small, working steps
git add .
git commit -m "feat: add upload form"

# 4. Before pushing: update and check
git pull --rebase origin main
npm run check

# 5. Push and open a pull request
git push -u origin feat/short-name
```

- Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- One person owns one area at a time to avoid merge conflicts (e.g. one on `services/`, one on a page).
- Merge into `main` only when `npm run check` and `npm run build` pass.
- Never commit `.env.local` or real keys.

## 9. Adding shadcn/ui (optional)

Not installed, to keep the starter light. `cn()` in `src/lib/utils.ts` already matches what shadcn expects. If you want it:

```bash
npx shadcn@latest init
npx shadcn@latest add dialog input
```

shadcn's own `button` would overwrite `src/components/ui/button.tsx`. Keep one or the other.

## 10. Troubleshooting

- **Port 3000 in use:** `npm run dev -- -p 3001`
- **Type errors about `LayoutProps` / `PageProps`:** run `npm run typecheck` (it generates route types) or start `npm run dev` once.
- **Env change not picked up:** restart the dev server.
- **`AGENTS.md`:** created by Next.js for AI coding assistants. It points them to the docs bundled in `node_modules/next/dist/docs/`. Keep it.
