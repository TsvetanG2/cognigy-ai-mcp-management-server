# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Add new tools, features, or docs here as you build them.)

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

[Unreleased]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/compare/0.1.0...HEAD
[0.1.0]: https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/releases/tag/0.1.0
