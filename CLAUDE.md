# CLAUDE.md

Operating manual for working in this repository. Read this first, every session.

## What this project is
A **local, open-source MCP server** that lets coding agents build, configure, test, and operate **Cognigy.AI** agents via the Cognigy.AI REST API. We *manage* Cognigy — we are NOT exposing a Cognigy bot as an MCP.

**The full spec lives in `cognigy-mcp-server-plan.md`. Read it before any non-trivial task.** Do not duplicate its content here; if something conflicts, the plan wins and you should flag it.

## Current status

**Phase 0: COMPLETE** | **Phase 1: COMPLETE** | **Phase 2: NOT STARTED**

### What's done
- Project scaffold with TypeScript + MCP SDK
- Environment config (`COGNIGY_BASE_URL`, `COGNIGY_API_KEY`)
- OpenAPI spec downloaded (8.4MB, 250 endpoints, v2026.11.0)
- Generated TypeScript types from OpenAPI (166K lines)
- Prism mock server configured
- **23 MCP tools** implemented across 7 domains
- **21 unit tests** passing, build succeeds

### Implemented tools (23 total)

#### Phase 0 — Core reads (5 tools)
| Tool | Description |
|------|-------------|
| `list_projects` | Lists all projects accessible by API key |
| `list_flows` | Lists all flows in a project |
| `get_flow` | Gets detailed metadata for a specific flow |
| `get_flow_settings` | Gets settings/configuration for a flow |
| `get_latest_log_entries` | Gets latest execution logs for debugging |

#### Phase 1 — Inspect & interact (17 tools)

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

### Next up (Phase 2 — Author & test)
- Node authoring: `create_node`, `update_node`, `delete_node`, `move_node`
- Intent/Example CRUD: `create_intent`, `create_example_sentence`, etc.
- Playbooks + Assertions: `run_playbook`, `list_playbook_runs`
- NLU training: `train_intents`, `generate_nlu_scores`
- Composite tools: `run_regression`, `audit_nlu`, `score_utterance`

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
├── cognigy-client.ts     # Cognigy REST client wrapper
├── generated/            # Auto-generated types (do not edit)
│   └── cognigy-api.d.ts
└── tools/                # MCP tool implementations (23 files)
    ├── index.ts          # Tool registration
    ├── list-projects.ts
    ├── list-flows.ts
    ├── get-flow.ts
    ├── get-flow-settings.ts
    ├── get-latest-log-entries.ts
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
    └── get-task.ts

tests/                    # Unit tests (7 files, 21 tests)
├── nodes.test.ts
├── intents.test.ts
├── endpoints.test.ts
├── sessions.test.ts
├── conversations.test.ts
├── snapshots.test.ts
└── tasks.test.ts
```

## How we work
- **Phase by phase.** Follow the roadmap in plan §6. Do NOT jump ahead to later-phase tools. Right now we are on: **Phase 2**.
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

## Security guardrails (non-negotiable)
- Never log, echo, or print the API key.
- Never include secret/credential field values (e.g. from Connections) in tool output. Redact them.
- Never commit `.env`, fixtures containing real keys, or downloaded Snapshots with sensitive data. Keep them in `.gitignore`.

## Naming
- Package/repo signals "manage Cognigy", e.g. `cognigy-ai-mcp`. Avoid names that collide with Cognigy's own "MCP Server" endpoint feature.
- `mcpName` in package.json (GitHub auth) must start with `io.github.<username>/`.

## Out of scope for now
- Hosted/remote transport, OAuth, multi-tenant (that's plan Phase 3 — do not start).
- The Super API-Key (on-prem only — ignore).
