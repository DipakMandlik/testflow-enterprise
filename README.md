# Pibythree Quality Hub

A digital quality-inspection platform that replaces the Excel-based EQT functional test
checklist with a structured digital workflow. The check — a single quality point on a
template — is the central business object; every screen (assignment, execution, evidence,
review, retest, reporting, audit) revolves around it:

```
Login → Verify Location/Station → Dashboard → My Tests → Digital Quality Worksheet
  → Record outcome (Pass/Fail/N/A/Measurement) → Capture failure (category/severity/evidence)
  → Submit → Quality Checker → Approve / Reject / Request Retest (per check)
  → Tester retests only the flagged check(s) → Resubmit → Approve → Completed
  → Reports & AI-assisted insight → Audit trail
```

Built on **TanStack Start** (TanStack Router + React 19 + Vite), **Tailwind CSS 4** and
**shadcn/ui**, originally scaffolded in [Lovable](https://lovable.dev) as a test-management
tool and evolved in place into this product on the same architecture.

## What's implemented

- **Authentication + a real location/station gate** — Employee ID + password, six-digit OTP,
  then (for testers only) a plant/location and station verification step. This is a genuine
  navigation guard enforced in `AppShell` for every protected route — a tester cannot reach a
  worksheet by navigating straight to its URL without verifying first.
- **Role-based access** — Tester, Quality Checker, Manager, Senior Manager, Template Manager
  and Administrator, enforced through a centralized permission module
  (`src/lib/tms/permissions.ts`), not just hidden buttons.
- **Versioned, immutable templates** — a Template Manager authors Categories and Checks on a
  draft revision (check builder with reorder, mandatory/allow-N/A/evidence-required/measurement
  range config), validates and publishes it. Once published, a revision's checks are never
  mutated again; "Create new revision" clones into a fresh draft, and a revision diff shows
  exactly which checks were added, removed or modified. The seeded `OJAS-EQT` template mirrors
  the real Standard Checklist for EQT Functional Test of FATP units end to end — 113 checks
  across all 15 stations of the paper form (Check IN, Shipping Setting, Activation, Acoustics,
  Battery and Charging, Button, Camera, Wifi, Fcam, Front/Rear Optical Sensing, Touch, Display,
  SWDL, Check Out).
- **Digital Quality Worksheet** — category-grouped check list with search/filter, autosave
  (2s debounce, save-state indicator), Pass/Fail/N/A controls, auto-graded measurement checks
  (value compared against the check's acceptance range), a failure-capture panel (category,
  severity, description) that surfaces an AI-assisted "similar past failures" recommendation,
  a real camera-capable evidence uploader, and submission validation that blocks and lists the
  exact missing check codes with jump-to links.
- **Check-level retest, never overwriting history** — a `CheckResult` is one row per
  `(execution, check, attempt)`; a request-retest decision creates a brand-new attempt row only
  for the checks the Quality Checker flags, so "Attempt 1 Failed 14:22 → Attempt 2 Passed
  15:11" is a real, permanent record. During a retest round the worksheet only allows editing
  the flagged check(s) — everything else is locked read-only.
- **Quality Checker review** — a scannable check list (filterable to All/Failures/Retest/Evidence)
  opens a detail Sheet per check (expected/observed, failure detail, evidence, retest history,
  AI-assisted insight), then Approve, Reject or Request Retest from the same screen (with a
  required comment and a multi-select of exactly which checks need re-testing).
- **Manager assignment reassignment** — a Reassign sheet (in Admin and the Manager dashboard's
  team testing board) hands an assignment and its execution to a different tester through the
  existing `reassignAssignment` service call, blocked once the execution is approved/completed.
- **Reports & AI-assisted insight** — First Pass Yield, failure rate, retest rate, failure
  category hotspots (click to see the flagged checks), station performance and a pass/fail
  trend, plus a CSV export. "AI-assisted" surfaces are a deterministic, local, disclosed
  analysis — never authoritative — appearing on the worksheet and the review screen labeled
  "requires Quality validation." There is no LLM call; see **Honesty notes** below.
- **Administration** — users (role, active/inactive), plants/locations/stations (with status),
  devices, failure categories, unit registration and assignment — every action goes through the
  same domain services as the rest of the app and produces an audit event.
- **Notifications & audit trail** — every meaningful transition (assign, verify, start, submit,
  review, retest, approve, publish) creates a notification and an audit record; a shared
  timeline component renders both.
- **Global search** — `Ctrl/Cmd K` command palette over units, executions, checks and
  navigation.
- **White enterprise design system** — a single light theme (Pibythree blue primary, soft
  cool-white surfaces, professional green/amber/red semantics) driven entirely by the OKLCH
  tokens in `src/styles.css`; no dark theme is offered. The sign-in, OTP and location/station
  verification flow carries a dedicated premium branded treatment (Pibythree mark, gradient
  hero, "Powered by Pibythree") — a deliberate onboarding-only exception, not a second app theme.
- **State consistency** — one `AppState` object (users, plants/stations/devices, templates,
  units, assignments, executions, check results, evidence, reviews, notifications, audit) is
  the single source of truth for every screen; no component maintains its own copy of workflow
  state.

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
ASSIGNED → IN_PROGRESS → PENDING_REVIEW → APPROVED → COMPLETED
                              ↓        ↑
                         RETEST_REQUIRED → RETEST_IN_PROGRESS
                              ↓
                          REJECTED
```

Display labels are role-aware (`statusLabel(status, role)`) but always derive from this one
enum — e.g. `PENDING_REVIEW` reads "Awaiting Quality Review" to a tester and "Pending
Verification" to a Quality Checker, never a separately-tracked string. A `CheckResult` is
similarly the one source of truth per check attempt, keyed by `(executionId, templateCheckId,
attempt)` — the "current" result is simply the row with the highest attempt number, and prior
attempts are never edited or deleted.

## Demo credentials

| Employee ID | Name         | Role             |
| ----------- | ------------ | ---------------- |
| `TE-1001`   | Priya Sharma | Tester           |
| `TE-2001`   | Rajesh Kumar | Quality Checker  |
| `TE-3001`   | Anita Desai  | Manager          |
| `TE-4001`   | Arjun Nair   | Senior Manager   |
| `TE-5001`   | Kavya Menon  | Template Manager |
| `TE-9001`   | Admin User   | Administrator    |

**Password:** `pibythree@2026` · **OTP:** `123456` (also shown on the sign-in screen)

Seeded data gives every role something to look at immediately: a published template revision
with 113 checks across 15 categories (17 of them mandatory for release), an assigned unit, an
in-progress unit, a unit awaiting a retest with a real two-attempt history on one check, a unit
pending Quality review, one completed, and one rejected — the same scenario the E2E test drives
end to end.

## Honesty notes (what's real vs. simplified, and why)

This ships as a static SPA with no backend, so a few spec-described behaviors are implemented
as **real but locally-scoped** rather than faked:

- **"Sync"** — there is no backend to sync to; state already saves instantly to `localStorage`
  (that is the offline-first save). The online/offline indicator reflects real
  `navigator.onLine`/`online`/`offline` events, and the copy says "Saved to this device" rather
  than implying cloud sync.
- **AI-assisted insight** — no LLM call (there's no safe place to hold an API key in a static
  site). It's a deterministic client-side analysis over local execution data (failure frequency
  by category, keyword-overlap "similar failure" lookup), always labeled "AI-assisted
  recommendation — requires Quality validation." It never approves, rejects or overrides a
  result.
- **Camera capture** — a real `<input type="file" capture="environment">`, which genuinely
  opens the device camera on phones/tablets; not simulated.
- **Location verification** — selecting from a configured list of plants/locations/stations,
  not real GPS. The _gate_ itself is real: a session field plus a route guard enforced in the
  domain service layer (`canAccessWorksheet`), not just a hidden UI element.
- **Device "last seen"** — a manually-settable field, not live telemetry.
- **Export** — client-side CSV generation (Blob + download), not PDF rendering.
- **Check reordering** — up/down move buttons, not drag-and-drop.

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
bun run e2e         # playwright — full tester → quality-checker → retest → approval workflow
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
  (`pibythree-quality-hub-v1`); it is per-browser, not shared across devices or reviewers in
  real time. The service/repository split (`src/lib/tms/services.ts` vs `src/lib/tms/store.tsx`)
  is intentionally structured so this can be swapped for a real API without touching the UI.
- **Evidence files are stored as data URLs** in that same state, capped at 5 MB per file — fine
  for a demo, not for production volumes of photos.
- **Deep links on GitHub Pages** briefly render the login page's server-rendered markup before
  the client router corrects the URL and re-renders the right screen (the standard SPA fallback
  trade-off — see above). This can log a harmless one-time React hydration-mismatch warning in
  the browser console; it self-heals immediately and the resulting page is fully correct and
  interactive.
- **OTP and password are fixed demo values**, not real MFA/credential verification.
- See **Honesty notes** above for the AI insight, camera, location and export simplifications.
