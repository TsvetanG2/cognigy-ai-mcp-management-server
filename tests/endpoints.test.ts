/**
 * Unit tests for Endpoint tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListEndpoints } from "../src/tools/list-endpoints.js";
import { registerGetEndpoint } from "../src/tools/get-endpoint.js";
import type { Config } from "../src/config.js";

const mockClient = {
  indexEndpoints: vi.fn(),
  readEndpoint: vi.fn(),
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

describe("list_endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list endpoints in a project with pagination", async () => {
    mockClient.indexEndpoints.mockResolvedValue({
      items: [
        {
          _id: "ep-1",
          name: "Webchat",
          channel: "webchat",
          URLToken: "abc123",
          flowId: "flow-1",
          targetType: "flow",
          localeId: "locale-en",
          createdAt: 1699000000000,
          lastChanged: 1699000001000,
        },
        {
          _id: "ep-2",
          name: "REST API",
          channel: "rest",
          URLToken: "def456",
          agentId: "agent-1",
          targetType: "agent",
          localeId: "locale-en",
          createdAt: 1699000002000,
          lastChanged: 1699000003000,
        },
      ],
      total: 2,
      nextCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "list_endpoints");
    registerListEndpoints(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ projectId: "project-123", limit: 25 });

    expect(mockClient.indexEndpoints).toHaveBeenCalledWith({
      projectId: "project-123",
      limit: 25,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.projectId).toBe("project-123");
    expect(parsed.total).toBe(2);
    expect(parsed.endpoints).toHaveLength(2);
    expect(parsed.endpoints[0].channel).toBe("webchat");
    expect(parsed.endpoints[1].channel).toBe("rest");
  });
});

describe("get_endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a single endpoint with full details", async () => {
    mockClient.readEndpoint.mockResolvedValue({
      _id: "ep-1",
      name: "Webchat Production",
      channel: "webchat",
      URLToken: "abc123xyz",
      flowId: "flow-1",
      targetType: "flow",
      localeId: "locale-en",
      entrypoint: "project-123",
      active: true,
      useConversations: true,
      createdAt: 1699000000000,
      lastChanged: 1699000001000,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_endpoint");
    registerGetEndpoint(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ endpointId: "ep-1" });

    expect(mockClient.readEndpoint).toHaveBeenCalledWith({
      endpointId: "ep-1",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("ep-1");
    expect(parsed.name).toBe("Webchat Production");
    expect(parsed.channel).toBe("webchat");
    expect(parsed.active).toBe(true);
  });
});
