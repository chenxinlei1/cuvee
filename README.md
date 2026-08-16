# Cuvée

**Schema-grounded multi-agent vintage intelligence for French wine regions — with critic-backed backtest verification.**

Cuvée scores any vintage in Burgundy or Bordeaux on a 0-100 quality scale using:

- **Real climate data** — ERA5 1990-2024 reanalysis + NASA POWER 2025 + ECMWF SEAS5 forecast, DEM-downscaled to 61 1855-classed château centroids
- **Terroir geometry** — soil composition, elevation, distance-to-Gironde, microtopography, AOC envelope
- **Public-web evidence** — 5-channel Tavily harness across regulatory, sentiment, market, négociant, and policy sources, SQLite-cached
- **Private-document RAG** — vineyard TXT/CSV uploads are read as bounded UTF-8 text, split into overlapping chunks, ranked against the analysis query, and injected into extraction with source filenames
- **A 1,150-line vintage-quality JSON schema** with 28 features × 6 hard gates × 11 dynamic adjustments, scored by OpenAI in strict `json_schema` mode
- **Backtest verification** — for any past vintage, retrieves actual Wine Advocate / Decanter / Vinous / Jancis Robinson scores via Tavily and emits a directional verdict (`high_agreement` / `moderate_agreement` / `divergent`)

The pipeline runs end-to-end in ~40-55 s cold, < 50 ms warm. The dashboard is a 3-column Atlas shell (map + workflow hero + analysis drawer) with light/dark mode and full English / French i18n.

---

## Demo

https://github.com/user-attachments/assets/8740f19a-39b1-4bea-87ce-a74982b0f2c3

60-second walk-through of the live dashboard — château pick → workflow hero → analysis drawer with risk band, drivers, and backtest verdict.

---

## Quick start

### Prerequisites

| | Min | Verify |
|---|---|---|
| Node.js | `>=20` | `node -v` |
| pnpm | `>=10` | `pnpm -v` (install via `npm install -g pnpm@latest` or `corepack enable`) |
| Git | any | `git --version` |
| PostgreSQL | `>=16` | `psql --version` or `docker compose version` |

macOS / Linux / WSL2 all work. Native Windows isn't tested.

### 1. Clone and install

```bash
git clone https://github.com/weijt606/cuvee.git
cd cuvee
pnpm install
```

### 2. Configure providers

```bash
cp .env.example .env.local
```

Start PostgreSQL and initialize the schema:

```bash
docker compose up -d postgres
pnpm db:migrate
```

`DATABASE_URL` is required at runtime. Managed PostgreSQL services should use their pooled
connection string and the TLS settings required by the provider.

**One** LLM provider is required (any one of OpenAI / Anthropic / Qwen / DeepSeek / Ollama). Retrieval and everything else degrade to fixtures or fallbacks when the matching key is missing.

#### Core selection

| Variable | Required? | What it does | Default |
|---|---|---|---|
| `CUVEE_LLM_PROVIDER` | recommended | Default LLM provider — `openai`, `anthropic`, `qwen`, `deepseek`, or `ollama` | `openai` |
| `CUVEE_LLM_MODEL` | optional | Overrides the chosen provider's model id | per-provider default |
| `CUVEE_RETRIEVAL_PROVIDER` | optional | Override retrieval — `tavily`, `brave`, `searxng`, `null` | first configured (tavily → searxng → brave → null) |
| `NEXT_PUBLIC_DEMO_MODE` | optional | Set `true` to short-circuit the pipeline to fixtures (no network, no keys needed) | `false` |
| `NEXT_PUBLIC_DEMO_FAST` | optional | Direct-dispatch pipeline. Set `false` to fall back to the legacy GPT tool-use routing loop (~80 s/call) | `true` |

#### LLM providers — pick one

| Variable | What it does | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` + `OPENAI_MODEL` | OpenAI (default). **Don't use reasoning models** (`gpt-5*`, `o1`, `o3`) — they add 20-40 s of internal thinking that doesn't help structured JSON. Use `gpt-4o-mini`. | <https://platform.openai.com/api-keys> |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | Anthropic Claude. Strict JSON via the tool-use trick. | <https://console.anthropic.com/> |
| `QWEN_API_KEY` + `QWEN_MODEL` | Alibaba Qwen via DashScope (OpenAI-compatible mode) | <https://dashscope-intl.aliyuncs.com/> |
| `DEEPSEEK_API_KEY` + `DEEPSEEK_MODEL` | DeepSeek (OpenAI-compatible) | <https://platform.deepseek.com/> |
| `OLLAMA_BASE_URL` + `OLLAMA_MODEL` | Ollama (local + free + no API key). `ollama serve` then `ollama pull qwen2.5:7b`. | <https://ollama.com> |

#### Retrieval providers — pick one (or none for offline)

| Variable | What it does | Where to get it |
|---|---|---|
| `TAVILY_API_KEY` | Tavily managed search (free tier ~1k/mo) | <https://app.tavily.com/home> |
| `BRAVE_API_KEY` | Brave Search managed API (free tier 2k/mo, no card) | <https://api.search.brave.com/> |
| `SEARXNG_BASE_URL` + optional `SEARXNG_API_KEY` | Self-hosted SearXNG meta-search — truly free, no quota. Quick start: `docker run -d -p 8888:8080 searxng/searxng:latest` | <https://github.com/searxng/searxng> |

#### Memory layer (self-optimization, replaces sponsor fine-tuning)

| Variable | What it does | Default |
|---|---|---|
| `CUVEE_MEMORY_DISABLED` | Set `true` to disable the SQLite memory layer entirely (no episodic recall, no few-shot injection) | `false` |
| `CUVEE_MEMORY_MAX_ROWS` | Row cap; oldest rows are FIFO-evicted past this | `1000` |
| `CUVEE_MEMORY_FEW_SHOT_LIMIT` | Number of past predictions injected into the extraction prompt as calibration anchors | `3` |
| `CUVEE_DATA_DIR` | Runtime data root — SQLite state, bundled datasets, pre-hydrated cache export. The Docker image mounts a persistent volume here. | `data/` |
| `CUVEE_WORKER_ENABLED` | Run the in-process analysis worker. Set `false` to offload execution to a dedicated worker. | `true` |
| `CUVEE_WORKER_CONCURRENCY` | Max parallel analyses executed by the worker | `2` |
| `CUVEE_WORKER_POLL_MS` / `CUVEE_WORKER_STALE_MS` | Queue poll interval / heartbeat staleness for crash re-claim | `1500` / `60000` |
| `CUVEE_TASK_TTL_MS` | Finished/pending tasks are deleted after this TTL | `24h` |

> `.env.local` is git-ignored. **Never commit real keys.** This repo is public.

#### Authentication and RBAC

Cuvée uses revocable, database-backed HttpOnly/Secure sessions and PostgreSQL for users, roles,
permissions, organizations, reports, documents, and audit logs. Five system roles are seeded:
`platformAdmin`, `wineryAdmin`, `wineryStaff`, `buyerAdmin`, and `buyerStaff`. Their permission
assignments live in PostgreSQL and can be changed from the Platform Admin console. Every request
reloads effective permissions, so changes apply to existing sessions immediately; hiding a
browser control is never treated as authorization.

Local demo accounts are seeded automatically in development. Production only seeds them when
`CUVEE_SEED_DEMO_USERS=true`; never enable that flag for a public deployment.

| Role | Email | Password |
|---|---|---|
| 平台超级管理员 | `peradmin@cuvee.demo` | `cuvee-platform-2024` |
| 酒庄管理员 | `winery-admin@cuvee.demo` | `cuvee-winery-2024` |
| 酒庄操作员 | `winery-staff@cuvee.demo` | `cuvee-cellar-2024` |
| 商超 / 酒商管理员 | `buyer-admin@cuvee.demo` | `cuvee-buyer-admin-2024` |
| 采购员 | `buyer-staff@cuvee.demo` | `cuvee-buyer-staff-2024` |

Platform Admin can open `/admin` and configure the role-permission matrix. Winery roles receive
the Vineyard workspace permission; buyer/trade roles receive the Trade workspace permission.
Both sides can run analysis in their own workspace. Report owners, organization report managers,
and Platform Admin can grant or revoke access. Replace the demo accounts before production.

New users can submit `/register` with an industry organization type (`chateau`, `negociant`,
`distributor`, or `buyer`). Self-registration always creates a `pending` Buyer Staff account;
it cannot sign in until a Platform Admin approves it and assigns the final role. Platform Admin may also create
an active user directly, change roles, disable/enable accounts, and cannot alter their own role
or status accidentally.

Reports and documents carry a required `organization_id`. Reports have an explicit visibility level: `private` (owner + Platform Admin only), `restricted`
(explicit user/organization grants), or `workspace` (members of the same organization only). A grant
may target an active user or an organization, expire at a fixed time, and independently allow
or deny Word download. Workspace visibility does not imply download permission; legacy shares are
migrated as view-only.

Workspace access is an explicit database permission rather than a client-side role check. Winery users normally land in Vineyard, Buyer users in Trade, and Platform Admins in the AOS management console. Château registration uses the bundled classed-growth list
instead of free text. Organization grants target an immutable organization UUID, so a
report shared with one buyer group is not exposed to every buyer organization.

Run `pnpm test:rbac` after RBAC or data-query changes to verify cross-organization isolation.

#### Production operations

Run the complete stack with `docker compose up -d --build`. The application runs as a non-root
user, waits for PostgreSQL health, and exposes `/api/health`. The backup service creates a verified
custom-format PostgreSQL dump every 24 hours in `backups/`, retains 14 days by default, and writes
a SHA-256 checksum. Override `BACKUP_INTERVAL_SECONDS` and `BACKUP_RETENTION_DAYS` as needed; copy
this directory to encrypted off-site storage in production.

Create an immediate backup with `pnpm db:backup`. Restore into a prepared database with:

```bash
DATABASE_URL=postgresql://... pnpm db:restore -- backups/cuvee-TIMESTAMP.dump
```

The restore script verifies the SHA-256 checksum when present, then restores
directly through `DATABASE_URL` (managed databases), through libpq environment
variables, or falls back to `docker compose exec` for the local stack.
`BACKUP_DIR` / `BACKUP_HOST_DIR` override the container and host backup paths.

`/api/metrics` returns Prometheus text metrics. Set `CUVEE_METRICS_TOKEN` to require a Bearer token.
Configure `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to enable server and browser error reporting;
without them, Sentry remains disabled. Logs are emitted as structured JSON with passwords, tokens,
cookies, and API keys redacted before writing; process gauges (uptime, heap, RSS) are exported
alongside the application counters. CI uploads source maps when `SENTRY_AUTH_TOKEN` is configured.

#### Observability stack (Loki + Grafana)

`docker compose up -d --build` now also starts a self-hosted observability
stack alongside the app:

| Service | Port | Purpose |
|---|---|---|
| `app` | 3000 | Cuvée + `/api/metrics` (Prometheus text) |
| `postgres` | 5432 | Application database |
| `backup` | — | Daily verified dumps (also feeds the backup alert) |
| `loki` | 3100 | Log aggregation (7-day retention) |
| `promtail` | — | Docker container log scraping → Loki (JSON level/event labels; never scrapes Loki itself) |
| `grafana` | 3001 | Dashboards + alerting (admin / `GRAFANA_ADMIN_PASSWORD`) |

Grafana ships with a **Cuvée Overview** dashboard (analysis throughput,
failure rate, task queue, worker heartbeat, database health, process RSS,
report activity) and five provisioned alert rules:

| Alert | Expression (abridged) | Severity |
|---|---|---|
| Analysis failure rate high | `errors / clamp_min(total,1) > 0.2` over 10m | critical |
| Analysis worker heartbeat stale | heartbeat absent or > 120s | critical |
| PostgreSQL unreachable | `cuvee_database_up == 0` for 2m | critical |
| Database backup missing | no `cuvee-*.dump` log line in 25h | warning |
| Database backup failed | backup container logs error/failure | critical |

Alerts route to the `cuvee-alerts` contact point. Set `ALERT_WEBHOOK_URL` /
`ALERT_EMAIL` (and `GF_SMTP_*` for email) in `.env` to receive
notifications; until then they are visible in Grafana → Alerting. If
`CUVEE_METRICS_TOKEN` is set, add the Authorization header to the Prometheus
datasource (see the commented block in
`monitoring/grafana/provisioning/datasources/datasources.yml`).

The CI `observability-smoke` job boots the full compose stack and verifies
that datasources, all five alert rules, and the dashboard are provisioned,
and that promtail → Loki actually delivers container logs.

For day-to-day operations (start/stop, alert changes, LogQL queries, disk
cleanup, troubleshooting), see [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md).

Restricted report grants can expire and independently allow download. Downloads are re-authorized
at request time, use a five-minute signed URL, and are recorded in `report_access_logs`. Report
managers can query `/api/reports/:id/access-log`.

GitHub Actions runs PostgreSQL migrations, disposable test fixtures, unit/security/RBAC/report
tests, a backup → restore round-trip against a disposable PostgreSQL, lint, type checks,
production build, and Docker image build.

Authentication limits each email address to five failed sign-in attempts per 15-minute window.
Users can change their password from `/account/security`; a successful change clears the current
session. Platform Admins can issue a temporary password from the user manager. Both operations are
audit-logged without storing either the old or new password in audit metadata.

#### Import an existing SQLite installation

The previous `data/.memory/auth.sqlite` file is retained as a rollback backup and is no longer
used at runtime. After applying the PostgreSQL migration, import it once with:

```bash
pnpm db:import-sqlite
```

The importer runs in one transaction and preserves user IDs, password hashes, reports,
documents, grants, audit logs, and login-attempt timestamps. It replaces the PostgreSQL
application tables, so do not run it against a populated production database unintentionally.

### 3. Verify the environment

```bash
pnpm check:env
```

Pings the configured providers and reports which sub-agents will run live vs. degraded. Exits non-zero if `OPENAI_API_KEY` is missing or invalid.

### 4. Run the dev server

```bash
pnpm dev
# → http://localhost:3000
```

Pick a château on the map (or a region in the sidebar), click **Run analysis**, watch the workflow hero animate through the agents. The result drawer reveals on click-through. Typical cold call: ~40-55 s; the orchestrator caches results in memory for 30 min, so the **second** run of the same query returns in <50 ms.

Analysis is submitted as an **async task**: `POST /api/analyze` returns a
`taskId` in milliseconds, an in-process worker (PostgreSQL-backed, `SKIP
LOCKED` claim + heartbeat crash recovery) executes the pipeline off the HTTP
request, and the client polls `GET /api/analyze/:taskId` until completion. A
configurable concurrency cap (`CUVEE_WORKER_CONCURRENCY`, default 2) protects
the LLM budget; disable the in-process worker with
`CUVEE_WORKER_ENABLED=false` when offloading execution to a dedicated worker
service.

Platform Admins get a **task queue management view** at `/admin`: live status
filter (queued / running / completed / failed / cancelled), stage + progress,
owner and request summary, error details, plus **cancel queued tasks** and
**retry failed tasks** (both audit-logged).

### Useful scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server with Turbopack HMR |
| `pnpm build && pnpm start` | Production build + serve |
| `pnpm typecheck` | `tsc --noEmit` strict type check |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |
| `pnpm test:unit` | Unit checks — permissions, download tokens, logger redaction, metrics, dataset + i18n integrity (no DB) |
| `pnpm test:security` | HMAC download-token checks |
| `pnpm test:rbac` | Cross-organization report isolation |
| `pnpm test:report-auth` | Report grants, expiry, revocation, download flag |
| `pnpm test:tasks` | Async task lifecycle — insert, claim, heartbeat, complete/fail, re-claim, cleanup |
| `pnpm test:backup` | Backup → restore round-trip against a reachable PostgreSQL |
| `pnpm check:env` | Provider key ping |
| `pnpm test:geo` | Smoke-test `geo_agent` directly |
| `pnpm test:weather` | Smoke-test `weather_agent` directly |
| `pnpm export:tavily-cache` | Dump the local SQLite cache to `data/tavily-cache-export.json` for repo-shipped warmup |
| `pnpm db:generate` | Generate Drizzle SQL migrations after schema changes |
| `pnpm db:migrate` | Apply pending PostgreSQL migrations |
| `pnpm db:studio` | Inspect PostgreSQL with Drizzle Studio |
| `pnpm db:import-sqlite` | One-time import from the legacy auth SQLite database |

### Run modes

```bash
# Default — full agent pipeline, accuracy-first
pnpm dev

# Offline rehearsal — no API calls, fixtures only, instant
NEXT_PUBLIC_DEMO_MODE=true pnpm dev

# Legacy GPT-routing loop — orchestrator lets the LLM decide tool order (~80 s/call)
NEXT_PUBLIC_DEMO_FAST=false pnpm dev
```

### Private-document RAG demo

The vineyard dashboard supports a lightweight, fully working private-document RAG path. Upload a `.txt` or `.csv` file before running an analysis:

```text
browser reads bounded UTF-8 content
  → POST /api/analyze
  → overlapping 1,200-character chunks (200-character overlap)
  → keyword relevance ranking against question + region + vintage
  → Top-3 chunks
  → source-grounded Extraction Agent prompt
  → drivers, rationale, and recommendations with source filenames
```

Current upload limits are intentionally conservative: at most 5 files, 100 KB per file, TXT/CSV only. File content is validated again by Zod at the API boundary. Retrieved document text is treated as untrusted evidence; the prompt explicitly instructs the model not to follow instructions embedded inside uploaded documents.

For a before/after demonstration, keep the region, vintage, and question identical. Run once without a document, then upload an internal production report and run again. The extraction trace reports the number of retrieved internal chunks, while the result should preserve concrete document metrics and the source filename.

This is a lightweight lexical RAG implementation, not a vector database. Its retrieval boundary is deliberately replaceable: a production deployment can promote the ranking stage to embeddings + pgvector, Chroma, or Milvus, add reranking, and persist document/chunk metadata without changing the Agent output contract.

---

## Architecture

```
POST /api/analyze
        │
        ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ Task queue (PostgreSQL)                                      │
   │   POST → analysis_tasks row (pending) → { taskId }           │
   │   worker claims with FOR UPDATE SKIP LOCKED, heartbeat +     │
   │   stale re-claim for crash recovery, TTL cleanup             │
   └───────────────────────────────┬──────────────────────────────┘
                                   ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ Orchestrator — directDispatch (default)                      │
   │   phase 1 (parallel)  weather + geo + tavily_agent           │
   │                       (tavily_agent uses defaultRetrieval()) │
   │   private evidence    TXT/CSV → chunks → Top-3 retrieval     │
   │   phase 2             extraction (schema-grounded)           │
   │                       + private evidence + memory few-shot   │
   │   phase 3 (parallel)  feature + backtest (if past year)      │
   │   then                memory().insert(record)                │
   └──────────────────────────────────────────────────────────────┘
        │
        ▼
   status → running/extracting/writing → completed + result
   client polls GET /api/analyze/:taskId
        │
        ▼
   AnalyzeResult { riskScore, qualityBand, drivers, recommendations,
                   feature, geoSnapshot, backtest?, trace }
```

The pipeline is **accuracy-first**: extraction always waits for and consumes all three external signal sources (climate, terroir, public-web), plus any retrieved first-party document evidence. Wallclock is dominated by public-web retrieval on cold queries (6-10 s), LLM extraction (~15-20 s), and the feature narrative (~10-15 s on `gpt-4o-mini`; longer with a local Ollama model).

### Two RAG paths

| Path | Evidence | Retrieval | Persistence | Purpose |
|---|---|---|---|---|
| Public-web RAG | Live public pages | Tavily, Brave, or SearXNG | 7-day SQLite query cache | Current regulatory, market, critic, and policy evidence |
| Private-document RAG | User-uploaded TXT/CSV | Overlapping chunks + lexical Top-K | Owner-scoped SQLite document library | First-party operational evidence such as frost damage, disease pressure, harvest timing, and yield |

Both paths converge in `extraction_agent`, which combines retrieved evidence with bundled climate and terroir data under the same structured scoring schema. Internal evidence is required to retain source filenames and multiple concrete facts when available, preventing the user-facing summary from collapsing a detailed report into a single generic driver.

### Provider layer

Every external dependency is pluggable behind a provider interface:

| Concern | Interface | Default | Alternatives |
|---|---|---|---|
| LLM (extraction, feature, backtest, orchestrator) | `defaultLLM()` in `src/lib/llm/` | OpenAI `gpt-4o-mini` | Anthropic Claude · Qwen (DashScope) · DeepSeek · Ollama (local, free) |
| Public-web retrieval | `defaultRetrieval()` in `src/lib/retrieval/` | first configured | Tavily · Brave (free 2k/mo) · SearXNG (self-hosted, free) · null (offline) |

Switching providers is a one-env-var change. See `.env.example` for the full table.

### Memory layer (self-optimization)

Every analysis is persisted to a local SQLite store at `data/.memory/analysis-history.sqlite` (gitignored). Records and recall queries are scoped by authenticated owner so one user's calibration context cannot enter another user's prompt. Two feedback loops:

1. **Few-shot** — extraction queries `memory().findSimilar()` before each LLM call and injects up to 3 nearest-neighbor past predictions as calibration anchors. The model sees its own prior verdicts and stays consistent.
2. **Calibration drift** — when `backtest_agent` fires, the predicted-vs-actual delta lands in the same row. `memory().calibrationDrift(region, persona)` exposes the bias (e.g. "we under-predict Médoc by 3 quality points on average").

This replaces sponsor-specific fine-tuning with a non-parametric, transparent mechanism — no model weights change, but the system gets better as it sees more data.

### Analysis reuse and caching

1. **Orchestrator memory cache** — owner-scoped in-memory `Map`, 30-min TTL, 64-entry LRU
2. **Persistent analysis-result cache** — SQLite, 24-hour TTL, keyed by authenticated owner plus a SHA-256 hash of region, persona, timeframe, question, château, and complete selected-document contents; identical reruns survive server restarts and do not call the LLM again
3. **Private document and report history** — authenticated server APIs store documents and reports with `owner_id`; Winery and Buyer user queries are owner-scoped, while Platform Admin can inspect all resources
4. **Tavily / retrieval SQLite** — `node:sqlite`, 7-day TTL, survives process restarts
5. **Repo-shipped pre-hydration** — `data/tavily-cache-export.json` seeds the SQLite cache on first read so curated demo queries skip the network

Changing any analysis input or selected document content produces a different cache key and triggers a fresh run. Only complete, non-degraded results are persisted, preventing failed or fallback executions from poisoning later requests.

### Schema-grounded scoring

The LLM emits a `qualityScore` (0-100, high = good) against the 1,150-line schema. Risk is computed in code as `100 - qualityScore`, then calibrated by deterministic evidence rules so different inputs cannot all collapse to the neutral 40/100 anchor. The rules cover harvest and flowering rainfall, frost days, growing-season temperature, heat stress, extreme temperature, GDD, winter reserves, cool nights, diurnal range, forecast uncertainty, terrain exposure, drainage, severe public-web events, and explicit internal-document metrics. The trace exposes `model-risk`, the signed evidence adjustment, and `final-risk`; the final quality band is derived from the calibrated score.

### Backtest verification

When `timeframe.end < today`, `backtest_agent` retrieves real-world critic + market data via a chateau-scoped search through `defaultRetrieval()`, then asks the configured LLM to compare the prediction against the retrieved evidence. Output: a `verdict` (`high_agreement` / `moderate_agreement` / `divergent`) plus 4-6 critic entries with quoted scores. This closes the loop — predictions are auditable, not vibes.

---

## Project layout

```
cuvee/
├── data/                      # CSV datasets + JSON schema + pre-hydrated cache
├── docs/
│   ├── AGENTS.md              # Agent-layer guide
│   └── PROVIDERS.md           # LLM + retrieval provider integration
├── scripts/                   # check:env, test:geo, test:weather, export:tavily-cache
├── src/
│   ├── app/                   # Next.js App Router (api · blog · trade · vineyard)
│   ├── components/
│   │   ├── wine/atlas/        # 3-column shell + workflow hero + drawer
│   │   ├── wine/charts/       # Recharts visualizations
│   │   ├── wine/trade/        # trade-persona UI
│   │   └── wine/vineyard/     # vineyard-persona UI
│   └── lib/
│       ├── agents/            # orchestration + private-doc retrieval + extraction + features
│       ├── llm/               # LLMProvider — OpenAI · Anthropic · Qwen · DeepSeek · Ollama
│       ├── retrieval/         # RetrievalProvider — Tavily · Brave · SearXNG · null
│       ├── memory/            # SQLite-backed episodic memory + few-shot retrieval
│       ├── wine/              # domain types, regions, products
│       └── env.ts
└── ...
```

For the deep dive on the agent contract, see [`docs/AGENTS.md`](docs/AGENTS.md). For provider wiring (LLM + retrieval) see [`docs/PROVIDERS.md`](docs/PROVIDERS.md).

---

## Roadmap

- [x] **Phase A — clean baseline** — single-repo standalone, accuracy-first pipeline, light/dark UI, backtest verification
- [x] **Phase B — provider abstraction + memory self-optimization** — `LLMProvider` interface (OpenAI / Claude / Qwen / DeepSeek / Ollama) · `RetrievalProvider` interface (Tavily / Brave / SearXNG / null) · SQLite memory layer with few-shot calibration anchors · Pioneer fine-tuning replaced by non-parametric learning from history
- [x] **Phase B4 — lightweight private-document RAG** — real TXT/CSV content upload · bounded API validation · overlapping chunking · lexical Top-3 retrieval · source-grounded extraction · deterministic evidence-aware fallback
- [ ] **Phase C — production knowledge base** — embeddings + pgvector/Chroma/Milvus · reranking · persistent document metadata · tenant-aware access control · PDF/XLSX parsing
- [ ] **Phase D — Burgundy expansion** — add Côte de Nuits / Côte de Beaune / Chablis terroir datasets
- [ ] **Phase E — Champagne** — extend schema with sparkling-specific gates
- [ ] **Phase F — self-hostable Docker** — `docker-compose` with optional local Ollama service

If a non-wine vertical reaches out (agriculture, climate-real-estate, insurance) — see `docs/AGENTS.md` for the agent contract; the orchestration pattern is domain-agnostic. A formal multi-vertical framework extraction (`packages/core` + `verticals/*` monorepo) is on the table once a second vertical is validated.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the agent contract, PR checklist, conventions, and acknowledgements (origin, hackathon credits, sponsor thanks). Branch names must be ASCII / English. No `Co-Authored-By:` AI trailers in commits.

## License

Source code is MIT — see [`LICENSE`](LICENSE).

Bundled datasets under `data/` follow their own upstream terms — see [`docs/DATA.md`](docs/DATA.md) for the full attribution table. **Climate data carries a mandatory Copernicus attribution string**: *Generated using Copernicus Climate Change Service information 2024. Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains.*
