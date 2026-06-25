# Security Policy

## Supported Versions

This project is in early development. Security fixes are applied to the latest
released version only.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report them privately through GitHub Security Advisories:

1. Go to the **Security** tab of this repository
2. Click **Report a vulnerability**
3. Fill in the details (see "What to include" below)

This keeps the report private until a fix is available.

If you cannot use GitHub Security Advisories, you may open a public issue that
contains **only** a request to be contacted privately — without any technical
details of the vulnerability.

### What to include

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof of concept if possible)
- Affected version(s) and environment (Node.js version, OS, MCP client)
- Any suggested mitigation

### Response expectations

This is an open-source project maintained by a single developer in their spare
time, so please be patient. As a rough guide:

- **Acknowledgement:** within 5 business days
- **Initial assessment:** within 14 business days
- **Fix or mitigation:** depends on severity and complexity

Credit will be given to reporters who wish to be acknowledged, unless they
prefer to remain anonymous.

## Scope

This MCP server runs **locally** and acts as a bridge between an AI coding
assistant (Claude, Cursor, etc.) and the Cognigy.AI Management API. The
security model reflects that:

### In scope

- Leakage of API keys or other secrets through logs, error messages, or tool
  output
- Failure of the secret-redaction logic for Connections and similar resources
- Mutating operations executing without the intended `dryRun` safeguard
- Input-validation bypasses (e.g. crafted tool input that escapes Zod schemas)
- Dependency vulnerabilities in this package's own dependency tree
- Path traversal, command injection, or arbitrary file access via tool inputs

### Out of scope

- Vulnerabilities in **`@cognigy/rest-api-client`** or the Cognigy.AI platform
  itself — report those to Cognigy / NiCE directly
- Issues caused by the user committing their own `COGNIGY_API_KEY` or `.env`
  file to source control
- Misuse of a validly provided API key (the server inherits whatever
  permissions the key was granted in Cognigy)
- Vulnerabilities in the AI client (Claude Desktop, Cursor, etc.) consuming
  this server

## Security Model & User Responsibilities

This server is designed with the following safeguards:

- **API keys live in memory only.** They are read from environment variables
  and are never written to disk or logs by this package.
- **Secrets are redacted.** Connection secrets and similar sensitive fields are
  stripped from tool output.
- **Safe by default.** All mutating tools default to `dryRun: true`, so an
  action must be explicitly confirmed before it changes anything in Cognigy.
- **Input validation.** All tool inputs are validated with Zod schemas before
  reaching the Cognigy API.

Because the server runs with whatever access your API key grants, **you** are
responsible for:

- Keeping `COGNIGY_API_KEY` out of version control (use `.env`, which is
  git-ignored, and never paste keys into committed config files)
- Scoping API keys to the minimum permissions you need
- Rotating keys if you suspect they have been exposed
- Reviewing tool actions before disabling `dryRun`, especially on production
  Cognigy projects
- Being aware that **Contact Profile** tools can export personal data subject
  to GDPR and similar regulations — handle that data accordingly

## Dependencies

This package relies on `@cognigy/rest-api-client` as a peer dependency. Keep
your dependencies up to date and run `npm audit` periodically. Security issues
in upstream dependencies should be reported to their respective maintainers.
