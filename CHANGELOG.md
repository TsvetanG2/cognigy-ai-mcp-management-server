# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-05

Fixes found by running the tools against a live Cognigy.AI trial environment.

### Fixed

- `create_node` / `update_node`: `config` is now sent as the node's `config`
  instead of being spread into the request body (the API rejected it).
  `update_node` deep-merges the given config over the current one.
- `create_intent`: `exampleSentences` are now created as real example
  sentences, so NLU training uses them.
- `create_connection`, `create_nlu_connector`, `create_knowledge_connector`:
  `fields` / `settings` / `config` are sent in their own field instead of
  being spread into the request body.
- `update_connection`, `update_nlu_connector`: `fields` / `settings` were
  accepted but never sent.
- `trigger_function`: input parameters now reach the function (the client
  unwraps `parameters`), and the new `functionInstanceId` is returned.
- `create_contact_profile`, `update_contact_profile`: contact IDs and GDPR
  consent are sent in the shape the API expects.
- `get_conversation_metrics`, `get_knowledge_query_metrics`,
  `get_call_metrics`: use the API's `year` / `month` parameters;
  `get_call_metrics` called a client method that does not exist.
- `get_handover_service`: called a client method that does not exist.
- Handover provider tools sent `providerId` instead of `handoverProviderId`.
- `update_analytics_record`: now sends the required `contactId`.
- `create_snapshot`, `upload_snapshot_package`, `create_package`,
  `upload_package` now return the new resource's ID instead of `null`.
- Dates in `diff_snapshots`, `promote_snapshot`, `restore_snapshot`,
  `list_packages`, `get_package` and the handover provider tools were
  wrong (shown as 1970).
- `list_audit_events`, `get_audit_event`, `list_contact_profiles`,
  `get_contact_profile` read field names that do not exist and returned
  mostly empty results.
- `update_*` tools no longer return empty objects; they report the fields
  that were updated.

### Changed

- `merge_contact_profiles` now takes `projectId`, `targetProfileId` and
  `sourceContactId`, matching the API (it merges a contact's profile into a
  target profile).
- `set_contact_profile_schema` now takes `{ field, internal, type }` entries
  and merges them with the existing custom fields.
- `create_handover_provider` takes the service name as `type` and resolves the
  service ID; settings are changed afterwards via `update_handover_provider`
  `properties`. `update_handover_provider` and `delete_handover_provider` now
  require `projectId`.
- `create_connection` requires `extension`.
- `create_knowledge_connector` takes `extension`, `version`, `config` and a
  `schedule` object instead of `connectionId`, `settings` and a cron string.
- `create_function` / `update_function` no longer accept `description`,
  `type` or `parameters`, which the API does not support; `update_function`
  accepts `isDisabled`.
- Metrics tools take `year` / `month` instead of `startDate`, `endDate` and
  `timezone`.
- `list_audit_events` filters by `user` and `eventType`; the unsupported
  `resourceType`, `startDate` and `endDate` filters were removed.
- Download link tools note that the link needs the `X-API-Key` header.

## [0.1.4] - 2026-07-27

### Added

- Published to the official MCP Registry (registry.modelcontextprotocol.io)
- Automated MCP Registry publishing in CI workflow via `mcp-publisher`

### Changed

- Publish workflow now publishes to both npm and MCP Registry
- Fixed `NODE_AUTH_TOKEN` placement in publish workflow (was at job level instead of step level)
- Removed `npm install -g npm@latest` from workflow (caused EBADENGINE on Node 22)
- Shortened server.json description to meet Registry 100-char limit

## [0.1.3] - 2026-07-27

### Changed

- Version bump (failed Registry publish due to description length)

## [0.1.2] - 2026-07-23

### Fixed

- Server now starts without credentials, so `tools/list` works before
  `COGNIGY_BASE_URL` and `COGNIGY_API_KEY` are configured. Previously the
  process exited at startup, which prevented MCP clients and registries from
  inspecting the tool surface. Credentials are now validated at request time
  with a clear error message.
- `@cognigy/rest-api-client` moved from `peerDependencies`/`devDependencies`
  to `dependencies`. npm auto-installs peers, but pnpm and yarn 1 do not, so
  installs with those package managers could fail to resolve the client at
  runtime.
- Pinned TypeScript to `~5.9.3`. The previous caret range allowed a fresh
  install to resolve TypeScript 7, which broke the build with missing Node
  globals and misresolved SDK types.
- Corrected `repository` URL and added `homepage` in `package.json`.

### Changed

- Publish workflow now runs on Node 22.
- Build script approvals moved to `pnpm-workspace.yaml` for pnpm 11.

## [0.1.1] - 2026-07-23

### Added

- `glama.json` for Glama MCP registry integration with server metadata
- MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`,
  `openWorldHint`) on all 132 tools for behavioral transparency
- CI workflow (`.github/workflows/ci.yml`) running lint, build, and tests on
  push and PR
- ESLint configuration with TypeScript support

### Fixed

- Zod v4 compatibility: updated `z.record()` calls to use two-argument form
- TypeScript 5.x compatibility for ESLint tooling

## [0.1.0] - 2026-06-06

### Added

- Initial release of the Cognigy.AI Management MCP Server.
- 132 MCP tools across 21 domains: Projects & Flows, Nodes, Intents & NLU,
  Endpoints, Sessions, Conversations, Playbooks & Testing, Snapshots, Packages,
  Connections, LLMs, NLU Connectors, Knowledge AI, Functions, Extensions,
  Contact Profiles, Analytics, Audit, Handover, Search, and Tasks.
- Safe-by-default behaviour: all mutating tools default to `dryRun: true`.
- Automatic redaction of connection secrets in tool output.
- API keys held in memory only, never logged or written to disk.
- Zod input validation on all tools.
- Pagination (`limit` / `skip`) on all list operations.
- Async-aware polling for long-running operations.
- Mock-first development against a Prism mock server (no Cognigy account
  required for local development).
- Test suite (49 tests).

[Unreleased]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/releases/tag/v0.1.0
