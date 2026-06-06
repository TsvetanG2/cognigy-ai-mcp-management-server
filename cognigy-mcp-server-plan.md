# Cognigy.AI MCP Server — Build Plan & Specification

> A local, open-source MCP server that lets coding agents (Claude Code, etc.) **build, configure, test, and operate Cognigy.AI agents** through the Cognigy.AI REST API.
>
> Status: Planning / pre-v0. This document is the single source of truth for the architecture, tool surface, testing strategy, and publishing plan.

---

## 0. The one-line idea

> "Talk to Claude Code in plain language → it reads, edits, deploys, and tests your Cognigy.AI agents for you."

The MCP server is **not** the conversational bot. It is the layer that exposes Cognigy.AI's management operations as tools an agent can call. The "user" of this MCP is the *developer's* agent, not the end customer.

---

## 1. Critical findings from API research (read before writing code)

These are the load-bearing facts. Build on these, not on assumptions.

### 1.1 There IS a full, official REST API
- Cognigy explicitly states that **anything visible or actionable in the frontend is exposed through the API** — it is "100% exposed" to developers. This is what makes a rich tool surface possible.
- API reference: `https://docs.cognigy.com/api-reference`
- Live OpenAPI spec (publicly viewable, no account needed to read it): `https://api-trial.cognigy.ai/openapi`
- Docs index for everything (great for agent-assisted exploration): `https://docs.cognigy.com/llms.txt`

### 1.2 API Base URLs depend on the environment
| Environment | Base URL |
|---|---|
| Trial | `https://api-trial.cognigy.ai` |
| SaaS – App (EU) | `https://api-app.cognigy.ai` |
| SaaS – App-US | `https://api-app-us.cognigy.ai` |
| SaaS – Other | `https://api-<company-name>.cognigy.cloud` |
| On-premises | value of `BACKEND_BASE_URL_WITH_PROTOCOL` |
| NiCE CXone | `https://cognigy-api-na1.nicecxone.com/` |

**Design implication:** the base URL must be a required config value, not hard-coded. The server should accept `COGNIGY_BASE_URL`.

### 1.3 Authentication is simple (API key)
- An API key authenticates as a user, without exposing credentials. Generated under **My Profile → API Keys**.
- Send it either as:
  - query parameter `api_key=<KEY>`, **or**
  - header `X-API-Key: <KEY>` ← **use the header** (don't leak keys in URLs/logs).
- Most APIs are **agent-bound**: a key can only touch agents/projects the user can access. (A "Super API-Key" that spans a whole organization exists but is **on-premises only**, disabled by default, and has a 15-minute TTL — ignore it for v1.)

**Design implication:** the user brings their own API key via env var (`COGNIGY_API_KEY`). The MCP server never stores it server-side — it runs locally on the developer's machine. Zero credential-custody liability.

### 1.4 There is an official client library — don't hand-roll HTTP
- Cognigy ships an official npm package, **`rest-api-client`** (TypeScript types included), to consume the API. Verify exact published name on npm before installing (likely `@cognigy/rest-api-client`).
- **Use it as the transport layer.** The MCP server becomes a thin adapter: MCP tool → client call → shaped result.

### 1.5 There is an official CLI worth studying / wrapping
- `Cognigy-CLI` on GitHub: `https://github.com/Cognigy/Cognigy-CLI`
- Capabilities: creating Snapshots, managing locales, deploying/cloning projects, push/pull agent resources.
- Reading its source is the fastest way to learn the real request patterns. Some tools can simply orchestrate CLI-style operations.

### 1.6 Snapshots are the deployment/config unit
- A **Snapshot** is an exportable bundle of an agent's configuration. It is how agents move between projects and how you back up / restore.
- Snapshots can be downloaded via the CLI (no size cap in current versions).
- **This is gold for offline development** (see Testing, §5): a Snapshot is structured JSON you can parse and reason about without a live connection.

### 1.7 Naming caution — Cognigy already uses "MCP" in two unrelated ways
- Cognigy has an **"MCP Server" Endpoint type** that exposes a *Cognigy agent* as an MCP server to other agents. That is the inverse of this project (we *manage* Cognigy; that feature *publishes* a Cognigy bot as a tool).
- Don't name the project `cognigy-mcp-server` ambiguously. Suggested name: **`cognigy-ai-mcp`** or **`mcp-cognigy-management`** to signal "manage Cognigy", not "Cognigy as MCP".

---

## 2. Architecture (v1 = local stdio)

```
┌──────────────────┐     stdio      ┌─────────────────────┐    HTTPS + X-API-Key   ┌──────────────────┐
│  Claude Code /   │ ◄────────────► │  cognigy-ai-mcp     │ ◄────────────────────► │  Cognigy.AI API  │
│  any MCP client  │   MCP tools    │  (local process)    │   rest-api-client      │  (trial / SaaS)  │
└──────────────────┘                └─────────────────────┘                        └──────────────────┘
                                            │
                                            ├── reads COGNIGY_BASE_URL + COGNIGY_API_KEY from env
                                            └── credentials never leave the user's machine
```

- **Transport:** stdio (standard for local MCP servers; simplest, no hosting).
- **Language:** TypeScript. Reasons: best MCP SDK support, official Cognigy client is TS, npm distribution = registry-friendly.
- **Core deps:** `@modelcontextprotocol/sdk`, the Cognigy `rest-api-client`, `zod` (tool input schemas).
- **Config (env vars):** `COGNIGY_BASE_URL`, `COGNIGY_API_KEY`, optional `COGNIGY_DEFAULT_PROJECT_ID`.
- **No database, no hosting, no OAuth** in v1. The user owns the trust boundary.

**v2 (optional, later):** hosted/remote server with OAuth 2.1 + multi-tenant isolation. Only build this if there is real pull. It changes cost and effort materially (see §7).

---

## 3. Tool surface (the full catalog)

Cognigy's "100% exposed" API means the realistic ceiling is **50+ tools**. Below is the catalog grouped by domain, then tiered into shippable phases (§6). Tool names are proposals.

### A. Projects & Flows (core)
- `list_projects` — list projects the key can access
- `get_project` — project metadata + resource counts
- `list_flows` — flows in a project
- `get_flow` — flow metadata
- `get_flow_settings` / `update_flow_settings`
- `get_flow_chart` — nodes/edges structure of a flow
- `create_flow` / `delete_flow`
- `get_flow_complete_json` — full export of a flow's logic

### B. AI Agents (agentic / newer Cognigy model)
- `list_ai_agents` / `get_ai_agent`
- `create_ai_agent` — persona, instructions, speaking style, safety settings, voice/TTS
- `update_ai_agent` / `delete_ai_agent`
- `check_ai_agent_name_availability`
- `get_ai_agent_jobs_and_tools` — jobs + associated tools for an agent
- `list_job_market_agents` / `hire_ai_agent` — instantiate from a ready-made template

### C. NLU — Intents, Slots, Lexicons
- `list_intents` / `get_intent` / `create_intent` / `update_intent` / `delete_intent`
- `add_intent_example_sentences` / `remove_intent_example_sentences`
- `list_lexicons` / `create_lexicon` / `add_lexicon_keyphrase`
- `list_slots` / `create_slot`
- `train_intents` / `get_intent_trainer_status`

### D. Snapshots & Deployment
- `list_snapshots` / `get_snapshot`
- `create_snapshot` — capture current project config
- `upload_snapshot` — push a snapshot into a project
- `deploy_snapshot` — restore/deploy a snapshot to a target project
- `download_snapshot` — export as JSON (offline-friendly)

### E. Endpoints & Channels
- `list_endpoints` / `get_endpoint`
- `create_endpoint` / `update_endpoint` / `delete_endpoint`
- `get_endpoint_url` — retrieve the runtime URL (e.g. REST/Webchat)

### F. Flow interaction / runtime (the testing workhorse)
- ~~`send_message_as_user_input`~~ — **DEPRECATED** (removed in v2026.7+). Do NOT implement.
- `inject_message` / `notify` — **Use these instead.** Inject user input or push AI output via the Endpoint inject/notify paths.
- `inject_context` / `reset_context` — manage session context/state.

### G. Conversations & Transcripts
- `get_conversation` — by `sessionId`
- `delete_conversation`
- `get_transcript` — full conversation transcript
- `search_conversations` — filter/paginate

### H. Contact Profiles
- `list_contact_profiles` / `get_contact_profile`
- `create_contact_profile` / `update_contact_profile` / `delete_contact_profile`
- `merge_contact_profiles` / `unmerge_contact_profiles`
- `export_contact_profile`
- `get_contact_profile_schema` / `set_contact_profile_schema`

### I. Connections (secrets/integrations)
- `list_connections` / `get_connection`
- `create_connection` / `update_connection` / `delete_connection`
- `get_connection_schemas`
- `batch_connections`
> Treat credentials in connections as sensitive — never echo secret field values back through tool results.

### J. Knowledge AI (RAG)
- `list_knowledge_stores` / `create_knowledge_store`
- `list_knowledge_sources` / `create_knowledge_source` / `upsert_knowledge_source` / `delete_knowledge_source`
- `create_knowledge_chunk`
- `get_knowledge_chunk_count`
- `search_knowledge` — query a store

### K. Analytics & Insights
- `get_conversation_counter_metrics` (project & org)
- `get_call_counter_metrics` (project & org)
- `get_knowledge_query_metrics`
- `update_analytics_record`
- `query_odata` — raw OData analytics pulls
- `list_goals` / `list_tasks` — goals & tasks tracking (ties to KPI reporting)

### L. Testing (Cognigy's native test framework)
- `list_playbooks` / `run_playbook` / `get_playbook_results`
- `get_assertions` / `run_assertions`
- `run_simulation` / `get_simulator_dashboard`
> This cluster is the **differentiator**. It turns the MCP into "an agent that regression-tests conversational flows" — exactly the gap noted in real interviews ("impressive, but not production-ready").

### M. Logs & Debugging
- `get_latest_log_entries` — recent execution logs
- `get_debug_messages`

### N. Audit & Administration
- `get_audit_events` / `get_audit_event`
- `get_organization_policies`
- `get_license_state`
- `create_api_key` / `revoke_api_key`
- `list_members` / `add_member`
- Agent Copilot configs: `list/get/create/update/delete_agent_copilot_configuration`

### Design conventions for all tools
- Every tool input validated with `zod`; every tool has a 1–2 sentence description written *for an LLM* (agents pick tools from descriptions).
- Return **shaped, compact JSON** — strip noise, cap list sizes, support `limit`/pagination. Agents pay tokens per result.
- Read tools are safe; **mutating tools** (`create_*`, `update_*`, `delete_*`, `deploy_*`) should support a `dryRun` flag and clear confirmation semantics.
- Never include secret/credential field values in any tool output.

---

## 4. server.json / packaging metadata (for the registry)

- Distribute the package on **npm** first (the registry only stores metadata, not code).
- Add `mcpName` to `package.json`. With GitHub auth it must start with `io.github.<your-username>/` → e.g. `io.github.tsvetang2/cognigy-ai-mcp`.
- Provide a clean `README.md` with: install command, required env vars, tool list, and a 30-second demo GIF.

---

## 5. Testing strategy WITHOUT a paid Cognigy account

This is the part that unblocks the whole project. Four layers, from "no account" to "live":

### Layer 1 — Spec-driven, fully offline (no account at all)
- The OpenAPI spec at `https://api-trial.cognigy.ai/openapi` is **publicly viewable**. Download it.
- Generate TypeScript types from it (`openapi-typescript`).
- Spin up a **mock server** from the spec (Stoplight **Prism**: `prism mock openapi.json`). Develop and unit-test every tool against the mock — request shaping, validation, error handling — with zero Cognigy access.

### Layer 2 — Record / replay fixtures
- Once you have *any* live access (even an hour), capture real responses for the key endpoints.
- Save them as fixtures; replay with `nock` or `msw` in your test suite. Now your CI is deterministic and offline.

### Layer 3 — Snapshots as offline test data
- A downloaded **Snapshot** is structured JSON of a real agent. Use it as a realistic fixture for any tool that parses flow/agent structure (`get_flow_chart`, snapshot tools, etc.) — no live calls needed.

### Layer 4 — The free Trial environment (your live target)
- Cognigy has a **trial environment** at `trial.cognigy.ai` (API at `api-trial.cognigy.ai`). Historically it required **no credit card** and stayed usable until you upgrade. Cognigy has moved upmarket, so trial access may now be gated behind a signup/request — request it and confirm current terms.
- **Likely shortcut for you:** Cognigy Academy / certification and partner routes typically grant trial or sandbox access. As a Cognigy Certified Specialist, check whether your existing Academy/partner login already gives you a usable environment before assuming you need to pay.
- Use the trial **only for final contract/integration tests** — keep the dev loop on Layers 1–3 so you're not rate-limited or dependent on uptime.

### Practical loop
`Layer 1 mock` for daily dev → `Layer 2 fixtures` in CI → occasional `Layer 4 trial` smoke test before each release.

---

## 6. Phased roadmap

> **Canonical source:** `TOOLS.md` defines the full tool catalog and build order.
> This section summarizes phases; see TOOLS.md for per-tool details.

### Phase 0 — Core reads ✅ COMPLETE
- Repo scaffold, TS + MCP SDK, env config, Cognigy `rest-api-client` wired up.
- Prism mock from OpenAPI spec.
- **5 core read tools**: `list_projects`, `list_flows`, `get_flow`, `get_flow_settings`, `get_latest_log_entries`.

### Phase 1 — Inspect & interact ✅ COMPLETE
- **Nodes**: `get_nodes`, `get_node`, `search_nodes`, `get_node_descriptors`.
- **Intents**: `list_intents`, `get_intent`.
- **Endpoints**: `list_endpoints`, `get_endpoint`.
- **Sessions**: `inject_context`, `reset_context` (for runtime interaction — NOT the deprecated `send_message_as_user_input`).
- **Conversations**: `get_conversations`, `get_conversation`, `get_transcript`.
- **Snapshots** (read): `list_snapshots`, `get_snapshot`, `get_snapshot_resources`.
- **Tasks**: `list_tasks`, `get_task`.

### Phase 2 — Author & test ✅ COMPLETE
- **Node authoring**: `create_node`, `update_node`, `delete_node`, `move_node`, `generate_node_output`.
- **Intent/Sentence authoring**: `create_intent`, `update_intent`, `delete_intent`, `train_intents`, `list_sentences`, `create_sentence`, `generate_sentences`.
- **NLU scoring**: `generate_nlu_scores`, `score_utterance`, `audit_nlu`.
- **Playbooks**: `list_playbooks`, `get_playbook`, `run_playbook`, `list_playbook_runs`, `get_playbook_run`, `run_regression`.

### Phase 3 — Deploy & promote ✅ COMPLETE
- **Snapshots lifecycle**: `create_snapshot` [async], `delete_snapshot` [async], `create_snapshot_download_link`, `restore_snapshot` [async].
- **Packages**: `list_packages`, `get_package`, `create_package` [async], `upload_package` [async], `merge_package` [async], `create_package_download_link`.
- **Composite**: `promote_project`, `diff_snapshots`, `clone_agent_across_env`.

### Phase 4 — Configure & administer (CURRENT)
- **Connections**: full CRUD (redact secrets).
- **LLMs**: `list_llms`, `create_llm`, `test_llm_connection`.
- **Knowledge AI**: stores, sources, chunks, connectors.
- **Functions & Extensions**: CRUD + run.
- **Contact Profiles**: full CRUD + merge/export.
- **Analytics**: metrics, OData queries.
- **Audit**: `list_audit_events`, org policies.
- **Users/Roles**: member management (gated, admin-only).
- **Org-wide Search**: `search_resources`.

### Phase 5 — Hosted (only if there's pull)
- Remote transport + OAuth 2.1 + multi-tenant isolation + observability.
- Material extra effort and recurring cost.

---

## 7. Cost

| Item | v1 (local, OSS) | v2 (hosted) |
|---|---|---|
| npm / PyPI / GitHub | Free | Free |
| MCP Registry listing | Free | Free |
| Hosting | $0 (runs on user machine) | ~$20–100/mo to start |
| Auth (WorkOS/Auth0) | $0 | Free tier → paid at scale |
| Domain (optional, for DNS auth / nicer name) | ~$12/yr | ~$12/yr |
| Cognigy access for testing | $0 (trial + mocks) | same |
| **Dominant cost** | **your time** | your time + infra |

**Bottom line:** v1 is effectively $0 in cash. The only real budget is focused hours.

---

## 8. Open questions to resolve early
1. Confirm the exact npm name of the official client (`rest-api-client` vs `@cognigy/rest-api-client`).
2. Confirm current Cognigy **trial** availability/terms (self-serve vs request-only in 2026) and whether your Academy/partner login already grants an environment.
3. Confirm which **testing** primitives (Playbooks, Assertions, Simulator) are reachable via the REST API vs UI-only — this determines how strong the differentiator can be.
4. Decide the project name to avoid collision with Cognigy's own "MCP Server" endpoint feature.
5. Pin the minimum Cognigy.AI version you support (the API evolves per release, e.g. snapshot size limits changed around 4.100).

---

## 9. Key links
- API reference: https://docs.cognigy.com/api-reference
- OpenAPI spec (readable, no account): https://api-trial.cognigy.ai/openapi
- Docs index for agents: https://docs.cognigy.com/llms.txt
- API & CLI overview: https://docs.cognigy.com/ai/for-developers/developers/api-and-cli
- Cognigy CLI source: https://github.com/Cognigy/Cognigy-CLI
- Snapshots: https://docs.cognigy.com/ai/agents/deploy/snapshots
- Testing (Playbooks/Assertions/Simulator): https://docs.cognigy.com/ai/agents/test/testing-your-ai-agents
- MCP Registry publishing quickstart: https://modelcontextprotocol.io/registry/quickstart
- Trial: https://trial.cognigy.ai
