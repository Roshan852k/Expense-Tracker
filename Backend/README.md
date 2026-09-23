# Spend Tracker

A small expense-tracking service: a Python/FastAPI REST API backed by SQLite,
plus a minimal plain-HTML/JS frontend to add expenses and view a summary.

## Project layout

```
spend-tracker/
├── app/
│   ├── main.py        # FastAPI app, routes, error handling
│   ├── auth.py          # API key authentication dependency
│   ├── crud.py         # DB queries / business logic (summary + insights math)
│   ├── models.py       # SQLAlchemy ORM model (Expense)
│   ├── schemas.py       # Pydantic request/response schemas + validation
│   └── database.py     # engine/session setup
├── tests/
│   └── test_api.py      # pytest suite (33 tests)
├── frontend/
│   └── index.html        # plain HTML/JS UI, no build step
├── requirements.txt
├── Dockerfile
├── Procfile
└── README.md
```

## How to run

### 1. Backend

```bash
cd spend-tracker
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

This creates `spend_tracker.db` (SQLite) in the working directory on first
run and serves the API at `http://127.0.0.1:8000`. Interactive API docs are
auto-generated at `http://127.0.0.1:8000/docs`.

Every endpoint except `/health` requires an API key (see **Authentication**
below). Without setting `SPEND_TRACKER_API_KEY` yourself, the server falls
back to a dev default of `dev-local-only-key` — fine for poking around
locally, but **set your own before deploying anywhere public**:

```bash
export SPEND_TRACKER_API_KEY="pick-a-real-secret"
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

`frontend/index.html` is a static file with no build step — just open it
directly in a browser (double-click it, or `open frontend/index.html`).
It's hard-coded to talk to `http://127.0.0.1:8000` (see the `API_BASE`
constant near the top of the `<script>` block); change that if you run the
API on a different host/port. CORS is wide open on the backend for this
reason.

There's a collapsed **"API key"** field above the form — paste in whatever
`SPEND_TRACKER_API_KEY` the server is using. It's kept only in that input
field (nothing is persisted to localStorage/cookies) and sent as the
`X-API-Key` header on every request.

### 3. Tests

```bash
pip install -r requirements.txt   # includes pytest, httpx
pytest tests/ -v
```

Tests use an isolated temporary SQLite file per test (via a `SPEND_TRACKER_DB_URL`
env var override) so they never touch your real `spend_tracker.db` and never
share state with each other.

## API

| Method | Path        | Description                                                   |
|--------|-------------|----------------------------------------------------------------|
| POST   | `/expenses` | Create an expense. Body: `{amount, category, note?, date}`     |
| GET    | `/expenses` | List expenses. Query params: `category`, `date_from`, `date_to`, `limit`, `offset` |
| GET    | `/summary`  | Total spend, spend by category, and month-over-month change    |

**Validation:**
- `amount` must be > 0 and have at most 2 decimal places (rejects `-5`, `0`, `5.999`).
- `category` must be non-blank.
- `note` is optional (defaults to `""`), capped at 500 chars.
- `date` must be a valid ISO date (`YYYY-MM-DD`).
- `date_from` must be ≤ `date_to` on `/expenses` (400 if violated).
- Validation failures return `422` with a flattened, human-readable `detail`
  string; the date-range check returns `400`.

**Example:**

```bash
curl -X POST localhost:8000/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount": "12.50", "category": "Food", "note": "Lunch", "date": "2026-09-10"}'

curl "localhost:8000/expenses?category=Food&date_from=2026-09-01&date_to=2026-09-30"

curl localhost:8000/summary
```

`/summary` response shape:

```json
{
  "total_spend": "260.00",
  "by_category": [{"category": "Food", "total": "260.00"}],
  "current_month": {"month": "2026-09", "total": "160.00"},
  "previous_month": {"month": "2026-08", "total": "100.00"},
  "month_over_month_change": "60.00",
  "month_over_month_change_pct": "60.00",
  "insights": [
    {
      "category": "Food",
      "previous_month_total": "100.00",
      "current_month_total": "160.00",
      "pct_change": "60.00",
      "message": "Food spend is up 60.0% vs last month ($100.00 → $160.00)."
    }
  ]
}
```
`month_over_month_change_pct` is `null` when last month's total was 0 (to
avoid divide-by-zero / misleading infinite percentages). "Current month"
means the calendar month containing today's date, not the month of the
most recent expense.

## Authentication

Every endpoint except `GET /health` requires a valid API key, sent as the
`X-API-Key` header. Unauthenticated or wrong-key requests get a `401`:

```bash
curl -i localhost:8000/summary
# HTTP/1.1 401 Unauthorized
# {"detail":"Missing or invalid API key. Send it in the 'X-API-Key' header."}

curl -H "X-API-Key: your-key-here" localhost:8000/summary
# 200 OK
```

The key is a single shared secret set via the `SPEND_TRACKER_API_KEY`
environment variable (falls back to `dev-local-only-key` if unset, purely
for local convenience — **always override this before deploying**).

**Why API key over JWT:** this is a single-tenant, single-user tool with no
concept of "accounts" yet (see *What I'd do differently*), so a shared
secret is the right amount of complexity — it gates the API without the
overhead of a login flow, token issuance/refresh, or a users table that
nothing else in the app currently needs. JWT would make sense the moment
there's more than one user or a real login page; `app/auth.py` is a single,
isolated file specifically so swapping the mechanism later doesn't ripple
through the rest of the code.

`/health` deliberately stays open — deployment platforms and uptime
monitors need to hit it without a secret.

## Insights: category spend spikes

`GET /summary` includes an `insights` array flagging any category whose
spend this calendar month is **more than 20% above** its spend last
calendar month (`app/crud.py::_build_insights`, threshold in
`SPIKE_THRESHOLD_PCT`). Categories with no spend at all last month are
skipped rather than flagged — a percentage increase off a $0 base is
undefined/infinite, so treating a brand-new category as a "spike" would be
a false signal, not a useful one. The frontend renders each insight as a
warning card under the summary.

## Deployment

The project is deployment-ready (`Dockerfile` + `Procfile`), but actually
pushing it to a public URL requires an account on the hosting platform —
that's a step only you can do, since it needs your credentials/billing, not
something I can complete from here. Any of Render, Railway, or Fly.io work
with what's already in this repo; here's the shortest path for each.

**Before any of them:** push this repo to GitHub (or a Git host the
platform can pull from) — all three deploy from a repo, not a local folder.

### Render
1. New → Web Service → connect your repo.
2. Render auto-detects the `Dockerfile`; leave build/start commands blank.
3. Under Environment, add `SPEND_TRACKER_API_KEY` = *(a real secret)*.
4. Deploy. Render assigns a `https://your-service.onrender.com` URL and
   injects `$PORT` automatically (the Dockerfile already reads it).

### Railway
1. New Project → Deploy from GitHub repo.
2. Railway detects the `Dockerfile` (or `Procfile` if you remove the
   Dockerfile) automatically.
3. Variables tab → add `SPEND_TRACKER_API_KEY`.
4. Settings → Networking → Generate Domain for a public URL.

### Fly.io
```bash
fly launch          # detects the Dockerfile, asks a few questions
fly secrets set SPEND_TRACKER_API_KEY="a-real-secret"
fly deploy
```

### The SQLite caveat that applies to all three
On these platforms the filesystem is **ephemeral by default** — a redeploy
or restart wipes `spend_tracker.db` unless you attach a persistent volume
(Render: "Disks"; Railway: "Volumes"; Fly: `fly volumes create`) and point
`SPEND_TRACKER_DB_URL` at a path inside it, e.g.
`sqlite:////data/spend_tracker.db`. For a real multi-user deployment I'd
reach for a managed Postgres instance instead (all three platforms offer
one) rather than fight SQLite's single-writer, single-file model in a
containerized/ephemeral environment — see *What I'd do differently*.

## Key design decisions

- **FastAPI + SQLAlchemy + SQLite.** FastAPI gives request validation,
  OpenAPI docs, and clean dependency injection almost for free, which
  matters more than raw framework speed for a project this size.
  SQLAlchemy's ORM keeps the schema and queries in one typed place rather
  than hand-written SQL strings.
- **`Decimal`/`Numeric(12,2)` for money, not `float`.** Floats introduce
  rounding error in sums; `Decimal` end-to-end (Pydantic → SQLAlchemy →
  JSON as strings) avoids that class of bug entirely. Amounts are also
  explicitly rejected if they carry more than 2 decimal places rather than
  silently rounding them.
- **Business logic lives in `crud.py`, not in the route handlers.** The
  summary calculation (`get_summary`) takes an optional injectable `today`
  parameter specifically so it can be unit-tested deterministically without
  monkeypatching `datetime.date.today()` everywhere.
- **Schema:** a single `expenses` table (id, amount, category, note, date,
  created_at) with indexes on `category`, `date`, and a composite
  `(category, date)` index for the common filtered-list query pattern.
  This is intentionally simple — categories are free-text strings rather
  than a separate `categories` table, which is the right tradeoff for a
  single-user MVP but wouldn't be if categories needed to be managed
  (renamed, merged, colour-coded, etc).
- **Validation and error responses.** Pydantic validators reject invalid
  amounts/categories/dates before they ever reach the DB; a custom
  exception handler flattens FastAPI's default (fairly verbose) 422 body
  into a single readable `detail` string, which the frontend surfaces
  directly. A separate `400` is used for a semantically-invalid query
  (`date_from > date_to`) as distinct from a malformed one.
- **Tests focus on behavior, not just happy paths:** invalid amounts (zero,
  negative, too many decimal places), blank/whitespace categories, wrong
  types, oversized notes, empty result sets, invalid date ranges, and the
  month-over-month math (including the zero-previous-month edge case) all
  have explicit tests, plus one test that exercises `crud.get_summary`
  directly with an injected date for a fully deterministic assertion.
- **Frontend is intentionally minimal** — a single static HTML file with
  vanilla JS and `fetch`, no build tooling, no framework — since the brief
  was to confirm end-to-end functionality rather than to showcase UI work.

## What I'd do differently with more time

- **Multi-user support.** There's a single shared API key gating the whole
  API, but no concept of a *user* — every expense is global, and anyone
  with the key can see/edit everyone's data. I'd add a `users` table, move
  to per-user JWTs issued via a real login, and scope every query by
  `user_id`.
- **Migrations.** Tables are created via `Base.metadata.create_all()` on
  startup, which is fine for a demo but doesn't handle schema evolution.
  I'd introduce Alembic migrations before this went anywhere near
  production data.
- **Pagination metadata.** `GET /expenses` supports `limit`/`offset` but
  doesn't return a total count or next/prev links — fine for a small
  dataset, but I'd add that (or cursor-based pagination) for scale.
- **A managed `categories` concept** — letting users rename/merge/delete
  categories, autocomplete existing ones in the UI, and prevent typos like
  "Food" vs "food" from silently splitting a category in two (currently
  categories are stored/matched case-sensitively, which is a known rough
  edge — I'd normalize casing or move to a lookup table).
- **Richer summary options** — a custom date range for month-over-month
  (not just "this calendar month vs last"), a trailing-30-days view, and
  a simple spend-over-time chart in the frontend.
- **Idempotency / duplicate protection** on `POST /expenses` (e.g. a
  client-supplied idempotency key) to guard against double-submits from
  the UI.
- **Structured logging and basic rate limiting** before this was exposed
  beyond localhost.
- **CI** running `pytest` (and a linter/formatter like `ruff`) on every push.
- **Postgres over SQLite for real deployment.** SQLite is a fine choice for
  a single-user local tool, but it doesn't hold up well on ephemeral
  container filesystems or under concurrent writers — see the SQLite
  caveat under *Deployment* above.
- **Rate limiting on the API key**, since a single leaked shared secret
  currently has no throttle or revocation story beyond rotating the env
  var and redeploying.
