# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[Unreleased]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/0.1.1...HEAD
[0.1.1]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/releases/tag/0.1.0
[0.1.2]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/v0.1.1...v0.1.2
