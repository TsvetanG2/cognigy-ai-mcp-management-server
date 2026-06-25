# Contributing

Thanks for your interest in contributing! This document explains how to get set
up and what's expected of contributions.

## Getting Started

1. Fork the repository and clone your fork
2. Install Node.js **20.0.0 or higher**
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your work:
   ```bash
   git checkout -b feature/amazing-feature
   ```

## Development Workflow

### Mock-first development

You don't need a Cognigy account to develop. Run against the Prism mock server:

```bash
# Terminal 1: start the mock server
npm run mock

# Terminal 2: run the tests
npm test
```

### Live API testing (optional)

```bash
cp .env.example .env
# Edit .env with your own Cognigy credentials
npm run dev
```

**Never commit your `.env` file or any real API keys.**

### Before you commit

Run all of these and make sure they pass:

```bash
npm run build   # Compile TypeScript
npm test        # Run the test suite
npm run lint    # Check code style
```

## Development Guidelines

When adding or changing a tool, follow the existing patterns:

- **Validate all input with Zod.** Every tool must define a Zod schema for its
  inputs.
- **Mutating tools must support `dryRun`** and default it to `true`. An action
  that changes state in Cognigy must never run silently.
- **Never log or expose secrets.** API keys stay in memory only, and connection
  secrets must be redacted from tool output.
- **Keep tool descriptions LLM-friendly** — 1–2 clear sentences describing what
  the tool does, since an AI assistant reads these to decide when to call them.
- **Add tests for new tools**, and test against the mock server before any live
  API.
- **Support pagination** (`limit` / `skip`) on list operations.

## Submitting a Pull Request

1. Make sure `npm test && npm run build` pass locally
2. Update documentation if you changed behaviour (README, `TOOLS.md`)
3. Add an entry to `CHANGELOG.md` under the `[Unreleased]` section
4. Push your branch and open a Pull Request with a clear description of what and
   why

Small, focused PRs are easier to review and merge than large ones.

## Commit Messages

This project loosely follows
[Conventional Commits](https://www.conventionalcommits.org/), e.g.:

- `feat: add tool for restoring snapshots`
- `fix: redact secret in connection list output`
- `chore(deps): bump zod to 3.x`
- `docs: clarify Knowledge AI setup`

## Reporting Bugs & Security Issues

- **Bugs / feature requests:** open a
  [GitHub issue](https://github.com/TsvetanG2/cognigy-ai-mcp-management-server/issues)
- **Security vulnerabilities:** do **not** open a public issue — follow the
  process in [SECURITY.md](SECURITY.md)

## Code of Conduct

By participating in this project you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE) that covers this project.
