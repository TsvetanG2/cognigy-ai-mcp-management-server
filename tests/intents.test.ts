/**
 * Unit tests for Intent tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListIntents } from "../src/tools/list-intents.js";
import { registerGetIntent } from "../src/tools/get-intent.js";
import type { Config } from "../src/config.js";

const mockClient = {
  indexIntents: vi.fn(),
  readIntent: vi.fn(),
};

const mockConfig: Config = {
  cognigyBaseUrl: "https://api-trial.cognigy.ai",
  cognigyApiKey: "test-api-key",
  defaultProjectId: "project-123",
};

function captureToolHandler(server: McpServer, toolName: string) {
  const toolCalls: Array<{ name: string; handler: Function }> = [];
  const originalTool = server.tool.bind(server);

  vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
    const handler = args[args.length - 1] as Function;
    toolCalls.push({ name: args[0] as string, handler });
    return (originalTool as Function)(...args);
  });

  return () => {
    const found = toolCalls.find((t) => t.name === toolName);
    if (!found) throw new Error(`Tool ${toolName} not found`);
    return found.handler;
  };
}

describe("list_intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list intents in a flow with pagination", async () => {
    mockClient.indexIntents.mockResolvedValue({
      items: [
        {
          _id: "intent-1",
          referenceId: "ref-1",
          name: "greeting",
          description: "User greets the bot",
          isDisabled: false,
          rules: [],
          tags: ["welcome"],
          createdAt: 1699000000000,
          lastChanged: 1699000001000,
        },
        {
          _id: "intent-2",
          referenceId: "ref-2",
          name: "goodbye",
          description: "User says goodbye",
          isDisabled: false,
          rules: [],
          tags: [],
          createdAt: 1699000002000,
          lastChanged: 1699000003000,
        },
      ],
      total: 2,
      nextCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "list_intents");
    registerListIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ flowId: "flow-123", limit: 25 });

    expect(mockClient.indexIntents).toHaveBeenCalledWith({
      flowId: "flow-123",
      limit: 25,
      includeChildren: false,
      preferredLocaleId: undefined,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flowId).toBe("flow-123");
    expect(parsed.total).toBe(2);
    expect(parsed.intents).toHaveLength(2);
    expect(parsed.intents[0].name).toBe("greeting");
    expect(parsed.intents[1].name).toBe("goodbye");
  });
});

describe("get_intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a single intent with full details", async () => {
    mockClient.readIntent.mockResolvedValue({
      _id: "intent-1",
      referenceId: "ref-1",
      name: "greeting",
      description: "User greets the bot",
      isDisabled: false,
      isRejectIntent: false,
      condition: "",
      rules: [{ type: "slot", slotName: "greeting" }],
      tags: ["welcome"],
      confirmationSentences: [],
      disambiguationSentence: "",
      createdAt: 1699000000000,
      lastChanged: 1699000001000,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_intent");
    registerGetIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ flowId: "flow-123", intentId: "intent-1" });

    expect(mockClient.readIntent).toHaveBeenCalledWith({
      flowId: "flow-123",
      intentId: "intent-1",
      preferredLocaleId: undefined,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("intent-1");
    expect(parsed.name).toBe("greeting");
    expect(parsed.rules).toHaveLength(1);
  });
});
