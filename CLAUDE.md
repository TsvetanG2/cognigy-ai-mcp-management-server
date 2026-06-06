# CLAUDE.md

Operating manual for working in this repository. Read this first, every session.

## What this project is
A **local, open-source MCP server** that lets coding agents build, configure, test, and operate **Cognigy.AI** agents via the Cognigy.AI REST API. We *manage* Cognigy — we are NOT exposing a Cognigy bot as an MCP.

**The full spec lives in `cognigy-mcp-server-plan.md`. The canonical tool catalog and build phases live in `TOOLS.md`** — this is the source of truth for what tools exist and their implementation order. If something conflicts, TOOLS.md wins for tools/phases.

## Current status

**Phase 0: COMPLETE** | **Phase 1: COMPLETE** | **Phase 2: COMPLETE** | **Phase 3: COMPLETE** | **Phase 4: COMPLETE**

### What's done
- Project scaffold with TypeScript + MCP SDK
- Environment config (`COGNIGY_BASE_URL`, `COGNIGY_API_KEY`)
- OpenAPI spec downloaded (8.4MB, 250 endpoints, v2026.11.0)
- Generated TypeScript types from OpenAPI (166K lines)
- Prism mock server configured
- **132 MCP tools** implemented across 25+ domains
- **49 unit tests** passing, build succeeds
- REST API client patch for GET requests (removes body to avoid 403)
- Established patterns: `dryRun` flag for mutating tools, async polling for long-running tasks
- **Phase 2 verified against live Cognigy Trial API** — all tools working
- **Phase 3 complete**: Snapshot lifecycle, Packages, and composite deployment tools
- **Phase 4 complete**: Connections, LLMs, NLU Connectors, Knowledge AI, Functions, Extensions, Contact Profiles, Analytics, Audit, Handover, Search

### Implemented tools (132 total)

#### Phase 0 — Core reads (5 tools)
| Tool | Description |
|------|-------------|
| `list_projects` | Lists all projects accessible by API key |
| `list_flows` | Lists all flows in a project |
| `get_flow` | Gets detailed metadata for a specific flow |
| `get_flow_settings` | Gets settings/configuration for a flow |
| `get_latest_log_entries` | Gets latest execution logs for debugging |

#### Phase 1 — Inspect & interact (18 tools)

**Nodes (4 tools)**
| Tool | Description |
|------|-------------|
| `get_nodes` | Lists all nodes in a flow |
| `get_node` | Gets full details of a single node |
| `search_nodes` | Searches nodes by text content |
| `get_node_descriptors` | Lists available node types/blueprints |

**Intents (2 tools)**
| Tool | Description |
|------|-------------|
| `list_intents` | Lists all intents in a flow |
| `get_intent` | Gets detailed intent configuration |

**Endpoints (2 tools)**
| Tool | Description |
|------|-------------|
| `list_endpoints` | Lists all endpoints in a project |
| `get_endpoint` | Gets detailed endpoint configuration |

**Sessions (2 tools)**
| Tool | Description |
|------|-------------|
| `inject_context` | Injects context data into a session |
| `reset_context` | Resets context for a session |

**Conversations (3 tools)**
| Tool | Description |
|------|-------------|
| `get_conversations` | Lists conversations for contact IDs |
| `get_conversation` | Gets conversation details for a session |
| `get_transcript` | Assembles human-readable transcript (composite) |

**Snapshots (3 tools)**
| Tool | Description |
|------|-------------|
| `list_snapshots` | Lists all snapshots in a project |
| `get_snapshot` | Gets snapshot details |
| `get_snapshot_resources` | Lists resources (flows, locales, etc.) in a snapshot |

**Tasks (2 tools)**
| Tool | Description |
|------|-------------|
| `list_tasks` | Lists async tasks in a project |
| `get_task` | Gets task status and progress |

#### Phase 2 — Author & test (21 tools)

**Node Authoring (5 tools)** — verified against live API ✅
| Tool | Description |
|------|-------------|
| `create_node` | Creates a node in a flow (Say, Question, etc.) |
| `update_node` | Updates node properties (label, config, etc.) |
| `delete_node` | Deletes a node from a flow |
| `move_node` | Moves a node to a new position in the flow |
| `generate_node_output` | AI-generates text or adaptiveCard content |

**Intent Authoring (4 tools)** — verified against live API ✅
| Tool | Description |
|------|-------------|
| `create_intent` | Creates a new NLU intent |
| `update_intent` | Updates intent properties |
| `delete_intent` | Deletes an intent (irreversible) |
| `train_intents` | Trains NLU model (async polling until done/error/timeout) |

**Example Sentences (3 tools)** — verified against live API ✅
| Tool | Description |
|------|-------------|
| `list_sentences` | Lists example sentences for an intent |
| `create_sentence` | Creates a new example sentence for training |
| `generate_sentences` | AI-generates example sentences for an intent |

**Playbooks & Testing (5 tools)** — verified against live API ✅
| Tool | Description |
|------|-------------|
| `list_playbooks` | Lists playbooks in a project |
| `get_playbook` | Gets playbook details with steps and assertions |
| `run_playbook` | Runs a playbook with async polling |
| `list_playbook_runs` | Lists run history for a playbook |
| `get_playbook_run` | Gets detailed run results with step outcomes |

**NLU Scoring (1 tool)** — verified against live API ✅
| Tool | Description |
|------|-------------|
| `generate_nlu_scores` | Scores an utterance against flow's trained intents |

**Composite Tools (3 tools)** — verified against live API ✅
| Tool | Description |
|------|-------------|
| `score_utterance` | User-friendly wrapper for NLU scoring with confidence levels |
| `run_regression` | Runs all playbooks in a project, returns pass/fail summary |
| `audit_nlu` | Audits NLU quality: finds low-sentence intents, disabled intents, overlaps |

#### Phase 3 — Deploy & promote (16 tools)

**Snapshot Lifecycle (6 tools)**
| Tool | Description |
|------|-------------|
| `create_snapshot` | Creates a snapshot of a project [async] |
| `delete_snapshot` | Deletes a snapshot [async] |
| `create_snapshot_download_link` | Gets temporary download URL for a snapshot |
| `restore_snapshot` | Restores a snapshot to its project [async] |
| `package_snapshot` | Packages a snapshot for download [async] |
| `upload_snapshot_package` | Uploads a snapshot package file [async] |

**Packages (7 tools)**
| Tool | Description |
|------|-------------|
| `list_packages` | Lists packages in a project |
| `get_package` | Gets package details |
| `create_package` | Creates a package from resources [async] |
| `delete_package` | Deletes a package [async] |
| `merge_package` | Merges a package into a project [async] |
| `upload_package` | Uploads a package file [async] |
| `create_package_download_link` | Gets temporary download URL for a package |

**Composite Tools (3 tools)**
| Tool | Description |
|------|-------------|
| `diff_snapshots` | Compares two snapshots and shows differences |
| `promote_snapshot` | Packages snapshot and generates download link |
| `clone_flow` | Clones a flow within a project |

#### Phase 4 — Configure & administer (72 tools) ✅

**Connections (5 tools)** — with secret redaction ✅
| Tool | Description |
|------|-------------|
| `list_connections` | Lists connections in a project/org |
| `get_connection` | Gets connection details (secrets REDACTED) |
| `create_connection` | Creates a new connection |
| `update_connection` | Updates connection settings |
| `delete_connection` | Deletes a connection |

**LLMs (7 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_llms` | Lists LLM configurations |
| `get_llm` | Gets LLM details with provider settings |
| `create_llm` | Creates a new LLM configuration |
| `update_llm` | Updates LLM settings |
| `delete_llm` | Deletes an LLM configuration |
| `clone_llm` | Clones an LLM configuration |
| `test_llm_connection` | Tests LLM provider credentials |

**NLU Connectors (5 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_nlu_connectors` | Lists NLU connectors (Dialogflow, LUIS, etc.) |
| `get_nlu_connector` | Gets NLU connector details |
| `create_nlu_connector` | Creates a new NLU connector |
| `update_nlu_connector` | Updates NLU connector settings |
| `delete_nlu_connector` | Deletes an NLU connector |

**Knowledge AI (21 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_knowledge_stores` | Lists knowledge stores (RAG containers) |
| `get_knowledge_store` | Gets store details |
| `create_knowledge_store` | Creates a new knowledge store |
| `update_knowledge_store` | Updates store settings |
| `delete_knowledge_store` | Deletes store and all contents |
| `list_knowledge_sources` | Lists sources in a store |
| `get_knowledge_source` | Gets source details and status |
| `create_knowledge_source` | Creates source (URL, file, or manual) |
| `update_knowledge_source` | Updates source metadata |
| `delete_knowledge_source` | Deletes source and chunks |
| `list_knowledge_chunks` | Lists text chunks in a store |
| `get_knowledge_chunk` | Gets chunk content |
| `create_knowledge_chunk` | Creates a manual chunk |
| `update_knowledge_chunk` | Updates chunk text/metadata |
| `delete_knowledge_chunk` | Deletes a chunk |
| `list_knowledge_connectors` | Lists automated ingestion connectors |
| `get_knowledge_connector` | Gets connector configuration |
| `create_knowledge_connector` | Creates connector (SharePoint, etc.) |
| `update_knowledge_connector` | Updates connector settings |
| `delete_knowledge_connector` | Deletes a connector |
| `run_knowledge_connector` | Triggers connector to ingest content |

**Functions (9 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_functions` | Lists custom code functions |
| `get_function` | Gets function code and settings |
| `create_function` | Creates a new function |
| `update_function` | Updates function code/settings |
| `delete_function` | Deletes a function |
| `list_function_instances` | Lists function execution instances |
| `get_function_instance` | Gets instance status and output |
| `trigger_function` | Triggers a function to run |
| `stop_function_instance` | Stops a running instance |

**Extensions (6 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_extensions` | Lists installed extensions |
| `get_extension` | Gets extension details with nodes/connections |
| `delete_extension` | Deletes an extension |
| `update_extension` | Updates extension settings (trusted code) |
| `upload_extension` | Uploads a new extension [async] |
| `update_extension_package` | Updates extension from URL [async] |

**Contact Profiles (11 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_contact_profiles` | Lists contact profiles |
| `get_contact_profile` | Gets profile details and stored data |
| `create_contact_profile` | Creates a new contact profile |
| `update_contact_profile` | Updates profile data |
| `delete_contact_profile` | Deletes a contact profile |
| `remove_contact_id` | Removes a contact ID from a profile |
| `merge_contact_profiles` | Merges two profiles into one |
| `unmerge_contact_profiles` | Splits a merged profile |
| `export_contact_profile` | Exports profile data (GDPR) |
| `get_contact_profile_schema` | Gets profile schema definition |
| `set_contact_profile_schema` | Sets profile schema |

**Analytics (4 tools)** ✅
| Tool | Description |
|------|-------------|
| `get_conversation_metrics` | Gets conversation counter metrics |
| `get_call_metrics` | Gets call counter metrics (Voice Gateway) |
| `get_knowledge_query_metrics` | Gets Knowledge AI query metrics |
| `update_analytics_record` | Updates analytics for a session |

**Audit (2 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_audit_events` | Lists audit events (changes to resources) |
| `get_audit_event` | Gets audit event details |

**Handover (7 tools)** ✅
| Tool | Description |
|------|-------------|
| `list_handover_providers` | Lists handover providers |
| `get_handover_provider` | Gets provider details |
| `create_handover_provider` | Creates a new provider |
| `update_handover_provider` | Updates provider settings |
| `delete_handover_provider` | Deletes a provider |
| `list_handover_services` | Lists available handover services |
| `get_handover_service` | Gets service details |

**Search (1 tool)** ✅
| Tool | Description |
|------|-------------|
| `search_resources` | Searches across all resources org-wide |

## Tech stack
- TypeScript, Node 20+
- `@modelcontextprotocol/sdk` ^1.29.0 (MCP server)
- `@cognigy/rest-api-client` ^2026.11.0 (official Cognigy client)
- `zod` ^3.23.0 for all tool input schemas
- Tests: `vitest` + `msw`/`nock` for HTTP mocking
- `openapi-typescript` for type generation; Stoplight `prism` for the mock server

## Commands
- `npm install` — install dependencies
- `npm run build` — compile TypeScript to dist/
- `npm run dev` — run server locally with tsx
- `npm test` — run test suite
- `npm run gen:types` — regenerate types from local openapi.json
- `npm run mock` — start Prism mock server on port 4010
- `npm run update:spec` — download fresh OpenAPI spec from Cognigy

## Project structure
```
src/
├── index.ts              # MCP server entry point
├── config.ts             # Environment config loader
├── cognigy-client.ts     # Cognigy REST client wrapper (includes GET body fix)
├── generated/            # Auto-generated types (do not edit)
│   └── cognigy-api.d.ts
└── tools/                # MCP tool implementations (91 files)
    ├── index.ts          # Tool registration
    │
    │ # Phase 0: Core reads
    ├── list-projects.ts
    ├── list-flows.ts
    ├── get-flow.ts
    ├── get-flow-settings.ts
    ├── get-latest-log-entries.ts
    │
    │ # Phase 1: Inspect & interact
    ├── get-nodes.ts
    ├── get-node.ts
    ├── search-nodes.ts
    ├── get-node-descriptors.ts
    ├── list-intents.ts
    ├── get-intent.ts
    ├── list-endpoints.ts
    ├── get-endpoint.ts
    ├── inject-context.ts
    ├── reset-context.ts
    ├── get-conversations.ts
    ├── get-conversation.ts
    ├── get-transcript.ts
    ├── list-snapshots.ts
    ├── get-snapshot.ts
    ├── get-snapshot-resources.ts
    ├── list-tasks.ts
    ├── get-task.ts
    │
    │ # Phase 2: Node authoring (dryRun pattern)
    ├── create-node.ts
    ├── update-node.ts
    ├── delete-node.ts
    ├── move-node.ts
    ├── generate-node-output.ts
    │
    │ # Phase 2: Intent authoring (dryRun + async polling)
    ├── create-intent.ts
    ├── update-intent.ts
    ├── delete-intent.ts
    ├── train-intents.ts
    │
    │ # Phase 2: Example sentences
    ├── list-sentences.ts
    ├── create-sentence.ts
    ├── generate-sentences.ts
    │
    │ # Phase 2: Playbooks & testing (async polling)
    ├── list-playbooks.ts
    ├── get-playbook.ts
    ├── run-playbook.ts
    ├── list-playbook-runs.ts
    ├── get-playbook-run.ts
    │
    │ # Phase 2: NLU scoring
    ├── generate-nlu-scores.ts
    │
    │ # Phase 2: Composite tools
    ├── score-utterance.ts
    ├── run-regression.ts
    ├── audit-nlu.ts
    │
    │ # Phase 3: Snapshot lifecycle
    ├── create-snapshot.ts
    ├── delete-snapshot.ts
    ├── create-snapshot-download-link.ts
    ├── restore-snapshot.ts
    ├── package-snapshot.ts
    ├── upload-snapshot-package.ts
    │
    │ # Phase 3: Packages
    ├── list-packages.ts
    ├── get-package.ts
    ├── create-package.ts
    ├── delete-package.ts
    ├── merge-package.ts
    ├── upload-package.ts
    ├── create-package-download-link.ts
    │
    │ # Phase 3: Composite tools
    ├── diff-snapshots.ts
    ├── promote-snapshot.ts
    ├── clone-flow.ts
    │
    │ # Phase 4: Connections (with secret redaction)
    ├── list-connections.ts
    ├── get-connection.ts
    ├── create-connection.ts
    ├── update-connection.ts
    ├── delete-connection.ts
    │
    │ # Phase 4: LLMs
    ├── list-llms.ts
    ├── get-llm.ts
    ├── create-llm.ts
    ├── update-llm.ts
    ├── delete-llm.ts
    ├── clone-llm.ts
    ├── test-llm-connection.ts
    │
    │ # Phase 4: NLU Connectors
    ├── list-nlu-connectors.ts
    ├── get-nlu-connector.ts
    ├── create-nlu-connector.ts
    ├── update-nlu-connector.ts
    ├── delete-nlu-connector.ts
    │
    │ # Phase 4: Knowledge AI (stores, sources, chunks, connectors)
    ├── list-knowledge-stores.ts
    ├── get-knowledge-store.ts
    ├── create-knowledge-store.ts
    ├── update-knowledge-store.ts
    ├── delete-knowledge-store.ts
    ├── list-knowledge-sources.ts
    ├── get-knowledge-source.ts
    ├── create-knowledge-source.ts
    ├── update-knowledge-source.ts
    ├── delete-knowledge-source.ts
    ├── list-knowledge-chunks.ts
    ├── get-knowledge-chunk.ts
    ├── create-knowledge-chunk.ts
    ├── update-knowledge-chunk.ts
    ├── delete-knowledge-chunk.ts
    ├── list-knowledge-connectors.ts
    ├── get-knowledge-connector.ts
    ├── create-knowledge-connector.ts
    ├── update-knowledge-connector.ts
    ├── delete-knowledge-connector.ts
    ├── run-knowledge-connector.ts
    │
    │ # Phase 4: Functions
    ├── list-functions.ts
    ├── get-function.ts
    ├── create-function.ts
    ├── update-function.ts
    ├── delete-function.ts
    ├── list-function-instances.ts
    ├── get-function-instance.ts
    ├── trigger-function.ts
    └── stop-function-instance.ts

tests/                    # Unit tests (9 files, 49 tests)
├── nodes.test.ts
├── intents.test.ts
├── endpoints.test.ts
├── sessions.test.ts
├── conversations.test.ts
├── snapshots.test.ts
├── tasks.test.ts
├── nodes-authoring.test.ts    # Phase 2: dryRun behavior tests
└── intents-authoring.test.ts  # Phase 2: dryRun + async polling tests
```

## How we work
- **Phase by phase.** Follow the roadmap in `TOOLS.md`. Do NOT jump ahead to later-phase tools. Right now we are on: **Phase 4** (Configure & administer) — Extensions next, then Contact Profiles, Analytics, Audit, Handover, Search.
- **Verify against the live source, not memory.** When unsure about an endpoint, fetch `https://docs.cognigy.com/llms.txt`, the relevant doc page, or the OpenAPI spec at `https://api-trial.cognigy.ai/openapi`. Cognigy's API changes per release — don't guess.
- **Develop offline-first.** Build and test every tool against the Prism mock + fixtures. Do NOT assume a live Cognigy account is available.
- Run the test suite and `npm run build` before claiming a task is done. Don't report success on unverified code.
- Small, reviewable commits. Conventional Commits style.

## Architecture rules
- **Never hand-roll HTTP.** All Cognigy calls go through the official client. The MCP layer is a thin adapter: tool → client call → shaped result.
- Base URL is config, never hard-coded. Read from `COGNIGY_BASE_URL`.
- The server runs locally and reads `COGNIGY_API_KEY` from env. We never store, persist, or transmit the key anywhere except in the `X-API-Key` header to Cognigy.

## Tool authoring conventions
- Every tool input is validated with a `zod` schema.
- Every tool has a clear 1–2 sentence description **written for an LLM to choose from** — say what it does and when to use it.
- Return **compact, shaped JSON.** Strip noise, cap list sizes, support `limit`/pagination. Agents pay tokens per result.
- Mutating tools (`create_*`, `update_*`, `delete_*`, `deploy_*`) MUST support a `dryRun` flag and behave conservatively by default.
- Read tools are safe; mutating tools should clearly state their effect in the description.

### Established patterns

**dryRun pattern** (all mutating tools):
```typescript
dryRun: z.boolean().default(true).describe("If true (default), validates without executing. Set to false to actually perform the operation.")
```
- Default `true` = safe by default, user must explicitly opt-in to mutations
- In dryRun mode: validate inputs, return `{ dryRun: true, wouldCreate/wouldUpdate/wouldDelete: {...} }`
- When `dryRun=false`: execute the mutation, return confirmation with IDs

**Async polling pattern** (long-running tasks like `train_intents`):
```typescript
// 1. Trigger the task
const taskResponse = await client.trainIntents({ flowId, mode });
const taskId = taskResponse._id;

// 2. Poll until terminal state
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);
while (Date.now() - startTime < timeoutMs) {
  if (TERMINAL_STATES.has(lastStatus)) break;
  await sleep(pollIntervalMs);
  task = await client.readTask({ taskId });
  lastStatus = task.status;
}

// 3. Return final status with elapsed time
```
- Configurable `timeoutMs` and `pollIntervalMs` with sensible defaults
- Returns status, taskId, elapsedMs for observability

## Security guardrails (non-negotiable)
- Never log, echo, or print the API key.
- Never include secret/credential field values (e.g. from Connections) in tool output. Redact them.
- Never commit `.env`, fixtures containing real keys, or downloaded Snapshots with sensitive data. Keep them in `.gitignore`.

## Naming
- Package/repo signals "manage Cognigy", e.g. `cognigy-ai-mcp`. Avoid names that collide with Cognigy's own "MCP Server" endpoint feature.
- `mcpName` in package.json (GitHub auth) must start with `io.github.<username>/`.

## Out of scope for now
- Hosted/remote transport, OAuth, multi-tenant (that's Phase 5 — do not start).
- The Super API-Key (on-prem only — ignore).
- Deprecated endpoints: `send_message_as_user_input` / `sendMessageAsAiAgentOutput` — use inject/notify instead.
