# Tata Electronics — Test Management & Test Execution Platform

An enterprise test management and execution platform that replaces spreadsheet-driven manual
testing with a structured digital workflow:

```
Login → Dashboard → My Tests → Test Case → Execute Steps → Record Results → Evidence
  → Submit → Reviewer → Approve / Send Back → Revision → Resubmit → Approval
  → Reporting → Audit
```

Built on **TanStack Start** (TanStack Router + React 19 + Vite), **Tailwind CSS 4** and
**shadcn/ui**, originally scaffolded in [Lovable](https://lovable.dev).

## What's implemented

- **Authentication** — Employee ID + password, six-digit OTP, session persisted client-side.
- **Role-based access** — Tester, Reviewer, Manager, Administrator, enforced through a
  centralized permission module (`src/lib/tms/permissions.ts`), not just hidden buttons.
- **Tester workspace** — step-by-step execution with a step navigator, Pass/Fail/Blocked/Skipped
  outcomes, conditional actual-result/comment/evidence fields, drag-free file attach with
  preview, real autosave (2s debounce, save-state indicator, survives a refresh), and a
  submission summary with validation.
- **Reviewer workspace** — inspect every step, result and piece of evidence, approve or send
  back with a required comment.
- **Revision loop** — sending an execution back updates every screen (dashboard, My Tests,
  the execution itself, notifications, audit trail) from one canonical `ExecutionStatus` value;
  nothing is tracked as a separate per-page status string.
- **Manager dashboard & Reports** — pass/fail/blocked metrics, module quality, tester
  productivity and review backlog, all derived live from execution records (Recharts).
- **Administration** — manage users (role, active/inactive), projects, test cases (with steps)
  and assignments, each action going through the same domain services as the rest of the app
  and producing an audit event.
- **Notifications & audit trail** — every meaningful transition (assign, start, submit, review,
  revision, approve, block) creates a notification and an audit record; a shared timeline
  component renders both.
- **Global search** — `Ctrl/Cmd K` command palette over test cases, executions and testers.
- **State consistency** — one `AppState` object (users, projects, test cases, executions, step
  results, evidence, reviews, notifications, audit) is the single source of truth for every
  screen; no component maintains its own copy of workflow state.

## Architecture

```
UI (routes/components)
  → hooks (useTms / useSession)
  → domain services (src/lib/tms/services.ts) — business rules, state machine, audit, notify
  → repository (src/lib/tms/store.tsx) — the only place that touches persistence
  → localStorage
```

The repository boundary in `store.tsx` is a drop-in replacement point: swapping localStorage
for an HTTP API/database means changing that one module, not the services or the UI.

The canonical execution state machine lives in `src/types/domain.ts`:

```
ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED → COMPLETED
                                           ↓
                                       SENT_BACK → IN_PROGRESS
```

Display labels are role-aware (`statusLabel(status, role)`) but always derive from this one
enum — e.g. `SENT_BACK` reads "Revision Required" to a tester and "Revision Requested" to a
reviewer, never a separately-tracked string.

## Demo credentials

| Employee ID | Name         | Role          |
| ----------- | ------------ | ------------- |
| `TE-1001`   | Priya Sharma | Tester        |
| `TE-2001`   | Rajesh Kumar | Reviewer      |
| `TE-3001`   | Anita Desai  | Manager       |
| `TE-9001`   | Admin User   | Administrator |

**Password:** `tata@2026` · **OTP:** `123456` (also shown on the sign-in screen)

Seeded data gives every role something to look at immediately: an assigned test, an
in-progress test, a submission pending review, and a test sent back for revision — the same
scenario the E2E test drives end to end.

## Local development

Requires Node.js 20+ (or [Bun](https://bun.sh)) — the project is developed with Bun and commits
a `bun.lock`.

```sh
bun install
bun run dev       # http://localhost:8080
```

```sh
bun run build     # production build (Cloudflare-Worker-style server bundle)
bun run preview
```

## Quality checks

```sh
bun run lint        # eslint
bun run typecheck   # tsc --noEmit
bun run test        # vitest — domain/service/permission unit tests
bun run e2e         # playwright — full tester → reviewer → revision → approval workflow
```

`bun run e2e` starts its own dev server; run `bunx playwright install --with-deps chromium`
once beforehand if Playwright's browsers aren't already installed locally.

## GitHub Pages deployment

TanStack Start renders per-request by default (a Cloudflare-Worker-style server), which
GitHub Pages — a static file host with no server runtime — can't run. Since this app has no
server loaders or server functions (every route is client-rendered against the localStorage
state in `TmsProvider`), it ships to Pages as a plain static site instead:

```sh
bun run build:gh-pages
```

This runs two steps (see `scripts/build-gh-pages.mjs`):

1. `vite build` with `GH_PAGES_BASE=/<repo>/` set, which both sets the asset base path and
   (via TanStack Start's `router.basepath` derivation) the client router's base path.
2. Boots the built server once, locally, just long enough to capture the HTML it renders for
   the site root, then writes that out as a static `dist/index.html` alongside the client
   assets — no server runs in production.

Because GitHub Pages has no server-side rewrites, deep links (e.g. `/testflow-enterprise/admin`)
would 404 on a hard refresh. The build also writes a `dist/404.html` that encodes the requested
path and redirects to `index.html`, which restores it via `history.replaceState` before the app
boots — the standard [SPA-on-GitHub-Pages fallback](https://github.com/rafgraph/spa-github-pages).
A `.nojekyll` file is included so Pages serves the `assets/` directory verbatim.

`.github/workflows/deploy.yml` runs this on every push to `main`: install → lint → typecheck →
unit tests → Playwright install → E2E tests → `build:gh-pages` → deploy via
`actions/deploy-pages`. The job fails if any step fails. Enable Pages once in
**Settings → Pages → Source → GitHub Actions** for the repository (the workflow's
`actions/configure-pages` step handles the rest).

## Known limitations

- **Persistence is browser-local.** State lives in `localStorage` under one key
  (`te-tms-state-v3`); it is per-browser, not shared across devices or reviewers in real time.
  The service/repository split (`src/lib/tms/services.ts` vs `src/lib/tms/store.tsx`) is
  intentionally structured so this can be swapped for a real API without touching the UI.
- **Evidence files are stored as data URLs** in that same state, capped at 5 MB per file — fine
  for a demo, not for production volumes of screenshots.
- **Deep links on GitHub Pages** briefly render the login page's server-rendered markup before
  the client router corrects the URL and re-renders the right screen (the standard SPA fallback
  trade-off — see above). This can log a harmless one-time React hydration-mismatch warning in
  the browser console; it self-heals immediately and the resulting page is fully correct and
  interactive.
- **OTP and password are fixed demo values**, not real MFA/credential verification.
