# Listing Verification Agent — Design

Status: **Proposed** (Oct 2026)

## Why

The current "verification" system doesn't verify anything. It tracks how long it has been since a listing was marked verified, and it counts "report closed" taps from visitors. Someone then has to call or visit each place. In practice that hasn't happened: as of Oct 2026 every one of the 108 listings was last verified in January.

The agent does the desk research a careful volunteer would do, on a schedule, and leaves the judgment calls to a human.

## Principles

1. **Non-invasive.** The agent only reads public information. It never calls, emails, messages or submits forms to an organization. If public information isn't enough, the listing goes to the admin queue and a person decides whether to reach out.
2. **Evidence or it didn't happen.** Every verdict cites its sources: URLs, what each says, and how recent it is.
3. **Humans own destructive and visible changes.** The agent never deletes a listing or edits its details directly. The only thing it may do on its own is mark a listing *verified* when the evidence is strong and nothing has changed.
4. **Polite to the web.** It runs a small number of searches and page fetches per listing, works in small batches, and never visits pages that need a login.

## How it runs

```
GitHub Actions
  ├─ one-time (manual):    initial sweep of every listing
  ├─ weekly  (Mon 6am CT): 25 listings, highest change-risk first
  └─ daily   (6am CT):     new "report closed" flags, new submissions,
                           listings added/edited without a primary source
        │
        ▼
scripts/verify-listings.ts
  for each listing in the batch:
    1. Google Places lookup ── business status, hours, phone, website
    2. Claude research     ── web search + fetch, judges the evidence
    3. submit_verdict      ── structured result (strict schema)
    4. apply policy        ── auto-verify, or queue for human review
    5. save to verification_checks
        │
        ▼
/verification-review (admin page) shows the evidence and an Approve / Edit / Remove choice for each item
```

### Pace

1. **Initial sweep.** All 108 listings are checked once, started by hand (`workflow_dispatch` with `mode=sweep`). It runs 3 listings at a time and takes about an hour. Every listing ends up with a baseline check, a `website`, and a `google_place_id`, which makes later checks cheaper and more accurate.
2. **Ongoing.** Each week the 25 listings with the highest change-risk score are checked. At 108 listings, that re-checks the riskiest ones every few weeks and every listing at least every 6–7 weeks.
3. **User reports** skip the line and are checked within a day.
4. **New and edited listings** also skip the line and are checked within a day, by the daily run:
   - **New public submissions** get pre-checked before you approve them. The admin sees the agent's evidence next to the submission, so approving it is a quick decision.
   - **Listings added or edited without a primary-source confirmation** (an admin edit marked "just reviewed the evidence," or a bulk import) are checked the next day, to confirm the new details are right.
   - **Edits backed by a primary source** (call, visit, the organization itself) are **not** re-checked. They're protected, as described in the next section.

### Primary sources come first

Information a human confirmed directly is a **primary source** and outranks anything the agent finds on the web. Examples: an admin call or visit, a correction from the organization itself, or a manually approved edit.

- Every check records `verificationSource`: `manual` (a human confirmed it), `agent`, or `initial` (the original import).
- **Recently manual-verified listings are skipped.** If `verificationSource = manual` and it was verified within the last 60 days, the weekly batch leaves it alone.
- **The agent never overrides a manual fact.** If it finds information that conflicts with a field a human confirmed in the last 6 months, it doesn't suggest a routine edit. It raises a "Conflicts with your manual entry" flag showing both versions side by side, and you decide.
- **Manual edits are logged by field.** Each `field_confirmations` row records which field (hours, phone, address and so on) a human confirmed and when, so the agent knows which facts are protected.

### Batch selection: change-risk score

Each weekly run scores every eligible listing and takes the top 25:

| Factor | Points |
|---|---|
| Days since last verification (any source) | +1 per week, max 26 |
| Last agent verdict was not high-confidence `active` | +8 |
| Google last showed `CLOSED_TEMPORARILY` or no match | +8 |
| Type changes often: Grocery Distribution, Hot Meal, Community Fridge | +5 |
| Youth Supper (CACFP) at the start or end of the school year (Aug, Dec–Jan, May–Jun) | +5 |
| Has a `reportedClosed` flag | goes to the top (also handled by the daily run) |
| Manual-verified within 60 days | excluded |

The weights are a starting point. After a few weeks, compare which factors actually predicted a real change and adjust them.

## Evidence sources

| Source | What it tells us | How |
|---|---|---|
| Google Places | `businessStatus` (OPERATIONAL / CLOSED_TEMPORARILY / CLOSED_PERMANENTLY), hours, phone, website | Places API (New) Text Search, using a **separate server-side key** restricted to the Places API. The existing browser key stays restricted to the Maps JavaScript API. |
| The organization's own website or page | Closure notices, distribution schedules, address moves | Claude `web_fetch` |
| North Texas Food Bank / Tarrant Area Food Bank partner finders | Whether the pantry is a current partner agency (strong evidence it's active) | Claude `web_search` / `web_fetch` |
| City, church, school district and news pages, 211 Texas | Recent schedules, closures, new locations | Claude `web_search` |

Out of scope: Facebook, Instagram and anything else that needs a login. Search results that summarize public posts are fine.

Per-listing limits: `web_search` `max_uses: 5`, `web_fetch` `max_uses: 6`.

## The Claude call

- **Model:** `claude-opus-5-5`, with adaptive thinking (always on for this model) and `output_config.effort: "medium"`.
- **Refusal fallback:** server-side `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), so a rare refusal falls back instead of failing the run.
- **Tools:**
  - `{ type: "web_search_20260209", name: "web_search", max_uses: 5, user_location: { type: "approximate", city: "Dallas", region: "Texas", country: "US" } }`
  - `{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 }`
  - `submit_verdict`: a custom tool with `strict: true`. This is the agent's **only** way to produce a result.
- **Loop:** the manual tool loop.
  - On `pause_turn`, resume by sending the paused turn back.
  - Stop when `submit_verdict` is called.
  - `tool_choice` stays `auto`. Forcing a specific tool returns a 400 on this model, so the prompt asks for the call instead.
- **Prompt inputs:** the listing (name, type, address, phone, hours, website, last verified date), any user report text, and the Google Places result.
- **Prompt injection:** the system prompt states that fetched pages are evidence to evaluate, never instructions. The agent has no tools that write to anything, and all database changes happen in our code according to the policy below.

### `submit_verdict` schema

```ts
{
  status: "active" | "active_with_changes" | "temporarily_closed" | "likely_closed" | "unverifiable",
  confidence: "high" | "medium" | "low",
  summary: string,                 // 1–3 sentences for the admin
  evidence: Array<{
    url: string,
    source_type: "google_places" | "official_site" | "food_bank_partner" | "government" | "news" | "other",
    finding: string,               // what this source says
    observed_date: string | null   // date shown on the source, if any (YYYY-MM-DD)
  }>,
  proposed_changes: {              // only fields that differ from the listing; null = no change
    hours: string | null,
    phone: string | null,
    address: string | null,
    website: string | null,
    appointment_required: boolean | null
  }
}
```

## Decision policy

| Verdict | What happens automatically | Admin queue? |
|---|---|---|
| `active`, **high** confidence, no proposed changes, at least one source dated within 90 days (or Google `OPERATIONAL`) | `lastVerifiedDate = now`, `verificationSource = "agent"`. If the listing had a user report, it's cleared **only if** a source is dated within 30 days. | No |
| `active`, medium/low confidence | Nothing | Yes, as "Probably active, please confirm" |
| `active_with_changes` | Nothing; the changes are stored as a suggestion | Yes, with **Apply changes** |
| `temporarily_closed` | Nothing | Yes |
| `likely_closed` | Nothing; never auto-removed | Yes, at the top |
| `unverifiable` | Nothing | Yes, as "Needs a call" |

A switch, `VERIFY_AUTO_APPROVE=true|false`, turns automatic verification off during rollout or whenever results look off.

## Data model changes

New table: `verification_checks`.

| column | type | notes |
|---|---|---|
| id | varchar (uuid) | |
| resource_id | varchar | FK → food_resources.id |
| checked_at | timestamp | |
| trigger | varchar | `sweep` / `scheduled` / `user_report` / `new_listing` / `edited_listing` / `submission` / `manual` |
| status | varchar | the verdict status |
| confidence | varchar | |
| summary | text | |
| evidence | jsonb | the evidence array |
| proposed_changes | jsonb | |
| places_snapshot | jsonb | raw Google Places fields used |
| resolution | varchar | `auto_verified` / `pending` / `approved` / `changes_applied` / `removed` / `dismissed` |
| resolved_at | timestamp | |
| model | varchar | e.g. `claude-opus-5-5` |
| input_tokens / output_tokens / web_searches | integer | for cost tracking |

New table: `field_confirmations` (primary-source log).

| column | type | notes |
|---|---|---|
| id | varchar (uuid) | |
| resource_id | varchar | FK → food_resources.id |
| field | varchar | `status`, `hours`, `phone`, `address`, `website`, `appointment_required` |
| value | text | the confirmed value |
| source | varchar | `admin_call`, `site_visit`, `org_contact`, `admin_edit` |
| note | text | optional, e.g. "Spoke with Pastor J., 10/14" |
| confirmed_at | timestamp | |

New columns on `food_resources`:
- `website` (text): the single most useful field for future checks. The agent proposes it the first time it finds one.
- `google_place_id` (text): caches the Places match so later checks skip the search step.
- `last_agent_check_at` (timestamp)

## Admin page changes (`/verification-review`)

- **Queue:** pending `verification_checks`, then user-reported listings with no check yet.
- **Each card:** verdict badge, summary, evidence links with dates, and a side-by-side view of any proposed changes.
- **Actions:**
  - **Still active, mark verified**
  - **Apply changes**
  - **Remove listing** (with confirmation, as today)
  - **Dismiss**
- **"How did you confirm?"** Each action asks, optionally, how you confirmed it: call, visit, the organization told us, or just reviewed the evidence. A call, visit or organization contact records a primary-source `field_confirmations` row. Reviewing the evidence alone does not.
- **Conflicts** with manual entries show both values side by side with the date of the manual confirmation.
- **History:** a "Recently auto-verified" list so you can spot-check the agent.

## Secrets and configuration

| Name | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub secret | Claude API |
| `GOOGLE_PLACES_API_KEY` | GitHub secret | Server-side key, restricted to Places API (New) |
| `DATABASE_URL` | GitHub secret | Neon (same database as the site) |
| `VERIFY_BATCH_SIZE` | workflow env | Default 25 |
| `VERIFY_AUTO_APPROVE` | workflow env | Default `true` after Phase 1 |

## Cost estimate

Rough figures; measure during Phase 0.

- **Claude:** roughly 30–60K input tokens (mostly fetched pages and search results) plus about 3K output per listing. At Opus 5.5 rates ($4 / $20 per million tokens), that's about **$0.20–0.35 per listing**, plus web search fees (a few cents).
- **Initial sweep:** 108 listings, a one-time cost of **about $25–40**. It's the most expensive run, because nothing has a known website or Place ID yet.
- **Ongoing:** about 110 checks a month (25 a week plus a handful of reports), or **roughly $20–35 a month**. That should drop once listings have websites and Place IDs on file.
- **Google Places:** about 110 lookups a month, inside the monthly free usage.
- **Billing:** API usage is billed in the Anthropic Console, separately from Claude app seats. Set a monthly spend limit there (for example $50).

To lower cost later: switch the research step to `claude-sonnet-5-5` (about half the price), or cut `max_uses`. Measure quality before switching.

## Rollout

1. **Phase 0: dry run.** Run 10 listings locally with no database writes, and print each verdict and its evidence. Include the 2 flagged listings and a mix of types. Check them by hand and tune the prompt.
2. **Phase 1: initial sweep.** Check all 108 once with `VERIFY_AUTO_APPROVE=true`, so only high-confidence, unchanged, recent-evidence results verify themselves. Everything else lands in the queue, which will probably be 30–50 items. Work through the queue. Every call you make along the way becomes a primary-source confirmation.
3. **Phase 2: staggered.** Turn on the weekly batch of 25 by change-risk score, plus the daily run for user reports. Spot-check the "Recently auto-verified" list for the first few weeks.

## Open questions

- Should `website` be added to the public submission form?
- Who besides the site owner should get the admin password and the weekly summary email?
