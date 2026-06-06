# Cognigy.AI MCP Server

> Model Context Protocol server for managing Cognigy.AI virtual agents through the Management API

## What is this?

**mcp-cognigy-management** is a local MCP server that enables AI coding assistants (Claude, Cursor, etc.) to build, configure, test, and operate [Cognigy.AI](https://www.cognigy.com/) conversational AI agents programmatically.

Instead of clicking through the Cognigy UI, you can now:
- Create and manage flows, nodes, and intents via natural language
- Run NLU training and regression tests automatically
- Deploy snapshots and packages across environments
- Configure LLMs, Knowledge AI, and integrations

**Built for:** Developers, solution architects, and SI partners who build on Cognigy.AI.

## Requirements

- **Node.js** 20.0.0 or higher
- **Cognigy.AI account** with API access (Trial, SaaS, or on-premises)
- **API Key** generated from Cognigy UI (My Profile → API Keys)

## Installation

```bash
# 1. Install the Cognigy REST API client (required peer dependency)
npm install @cognigy/rest-api-client

# 2. Install this MCP server
npm install -g mcp-cognigy-management
```

**Important:** The `@cognigy/rest-api-client` package is licensed under "Cognigy Proprietary License". By installing it, you agree to Cognigy's license terms.

## Configuration

Set environment variables before running:

```bash
# Required: Your Cognigy API endpoint
export COGNIGY_BASE_URL=https://api-trial.cognigy.ai

# Required: Your API key (never commit this!)
export COGNIGY_API_KEY=your-api-key-here

# Optional: Default project for operations
export COGNIGY_DEFAULT_PROJECT_ID=your-project-id
```

**Common Base URLs:**
| Environment | Base URL |
|-------------|----------|
| Trial | `https://api-trial.cognigy.ai` |
| SaaS EU | `https://api-app.cognigy.ai` |
| SaaS US | `https://api-app-us.cognigy.ai` |
| Dedicated | `https://api-<company>.cognigy.cloud` |

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "cognigy": {
      "command": "npx",
      "args": ["mcp-cognigy-management"],
      "env": {
        "COGNIGY_BASE_URL": "https://api-trial.cognigy.ai",
        "COGNIGY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "cognigy": {
      "command": "npx",
      "args": ["mcp-cognigy-management"],
      "env": {
        "COGNIGY_BASE_URL": "https://api-trial.cognigy.ai",
        "COGNIGY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cognigy": {
      "command": "npx",
      "args": ["mcp-cognigy-management"],
      "env": {
        "COGNIGY_BASE_URL": "https://api-trial.cognigy.ai",
        "COGNIGY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

This server provides **132 MCP tools** organized by domain:

| Category | Tools | Description |
|----------|-------|-------------|
| **Projects & Flows** | 5 | List projects, flows, flow settings, logs |
| **Nodes** | 9 | CRUD operations, search, move, AI output generation |
| **Intents & NLU** | 10 | Intent management, training, scoring, audit |
| **Endpoints** | 2 | List and inspect endpoint configurations |
| **Sessions** | 2 | Inject/reset conversation context |
| **Conversations** | 3 | Fetch conversations, transcripts |
| **Playbooks & Testing** | 6 | Run playbooks, regression tests |
| **Snapshots** | 9 | Create, restore, package, diff, promote |
| **Packages** | 7 | Create, merge, upload, download |
| **Connections** | 5 | Manage API connections (secrets redacted) |
| **LLMs** | 7 | Configure generative AI providers |
| **NLU Connectors** | 5 | External NLU (Dialogflow, LUIS, etc.) |
| **Knowledge AI** | 21 | Stores, sources, chunks, connectors (RAG) |
| **Functions** | 9 | Custom code functions, instances |
| **Extensions** | 6 | Upload, configure, manage extensions |
| **Contact Profiles** | 11 | Profile CRUD, merge, export (GDPR) |
| **Analytics** | 4 | Conversation, call, knowledge metrics |
| **Audit** | 2 | Audit event logs |
| **Handover** | 7 | Live agent providers and services |
| **Search** | 1 | Organization-wide resource search |
| **Tasks** | 2 | Async task status tracking |

### Key Features

- **Safe by default:** All mutating tools use `dryRun: true` by default
- **Async-aware:** Long-running operations poll until completion
- **Security:** API keys only in memory, secrets automatically redacted
- **Pagination:** All list operations support `limit` and `skip`

## Development & Testing

### Mock-first Development

Run against Prism mock server (no Cognigy account needed):

```bash
# Terminal 1: Start mock server
npm run mock

# Terminal 2: Run tests
npm test
```

### Live API Testing

```bash
# Create .env from template
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

### Build

```bash
npm run build    # Compile TypeScript
npm test         # Run test suite (49 tests)
npm run lint     # Check code style
```

### Regenerate Types (optional)

If you need to update the generated types from a newer Cognigy API:

```bash
npm run update:spec   # Download latest OpenAPI spec
npm run gen:types     # Regenerate TypeScript types
```

## Important: Dependencies

This package requires **`@cognigy/rest-api-client`** as a **peer dependency**. This means:

1. **You must install it separately** (see Installation above)
2. **You accept Cognigy's license terms** by installing their package
3. **We do not bundle or redistribute** any Cognigy code

**You are responsible for:**
- Reviewing and accepting Cognigy's proprietary license terms
- Having appropriate rights to use the Cognigy API
- Keeping your API credentials secure

The Cognigy REST API client is the official SDK maintained by Cognigy GmbH and is published on npm under "Cognigy Proprietary License".

## License

This MCP server is released under the **MIT License**. See [LICENSE](LICENSE) for details.

Note: The MIT license applies only to this MCP server code. Dependencies (particularly `@cognigy/rest-api-client`) are subject to their own licenses.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow existing code patterns (Zod schemas, dryRun flags, etc.)
4. Add tests for new tools
5. Run `npm test && npm run build` before committing
6. Submit a Pull Request

### Development Guidelines

- All tools must have Zod input validation
- Mutating tools must support `dryRun` flag (default: true)
- Tool descriptions should be LLM-friendly (1-2 sentences)
- Never log or expose API keys/secrets
- Test against mock server before live API

## Support

- **Issues:** [GitHub Issues](https://github.com/your-org/mcp-cognigy-management/issues)
- **Cognigy Docs:** [docs.cognigy.com](https://docs.cognigy.com)
- **MCP Spec:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

Built with [Model Context Protocol](https://modelcontextprotocol.io) SDK
