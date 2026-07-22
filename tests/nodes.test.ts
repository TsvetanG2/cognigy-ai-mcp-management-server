/**
 * Unit tests for Node tools.
 * These tests mock the Cognigy client to verify tool behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetNodes } from "../src/tools/get-nodes.js";
import { registerGetNode } from "../src/tools/get-node.js";
import { registerSearchNodes } from "../src/tools/search-nodes.js";
import { registerGetNodeDescriptors } from "../src/tools/get-node-descriptors.js";
import type { Config } from "../src/config.js";

// Mock Cognigy client
const mockClient = {
  indexChartNodes: vi.fn(),
  readChartNode: vi.fn(),
  searchChartNodes: vi.fn(),
  indexNodeDescriptors: vi.fn(),
};

const mockConfig: Config = {
  cognigyBaseUrl: "https://api-trial.cognigy.ai",
  cognigyApiKey: "test-api-key",
};

// Helper to capture registered tool handler
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

describe("get_nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list nodes in a flow with pagination", async () => {
    mockClient.indexChartNodes.mockResolvedValue({
      items: [
        {
          _id: "node-1",
          referenceId: "ref-1",
          type: "say",
          label: "Welcome Message",
          analyticsLabel: "welcome",
          isEntryPoint: true,
          isDisabled: false,
          extension: "basic",
          comment: "",
          commentColor: "",
        },
        {
          _id: "node-2",
          referenceId: "ref-2",
          type: "question",
          label: "Ask Name",
          analyticsLabel: "ask_name",
          isEntryPoint: false,
          isDisabled: false,
          extension: "basic",
          comment: "Get user name",
          commentColor: "#FF0000",
        },
      ],
      total: 2,
      nextCursor: null,
      previousCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_nodes");
    registerGetNodes(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ flowId: "flow-123", limit: 25 });

    expect(mockClient.indexChartNodes).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
      limit: 25,
    });

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flowId).toBe("flow-123");
    expect(parsed.total).toBe(2);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes[0].type).toBe("say");
    expect(parsed.nodes[1].comment).toBe("Get user name");
  });
});

describe("get_node", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a single node with full details", async () => {
    mockClient.readChartNode.mockResolvedValue({
      _id: "node-1",
      referenceId: "ref-1",
      type: "say",
      label: "Welcome Message",
      analyticsLabel: "welcome",
      isEntryPoint: true,
      isDisabled: false,
      extension: "basic",
      localeReference: "locale-en",
      comment: "",
      config: {
        text: "Hello! Welcome to our service.",
      },
      preview: { text: "Hello! Welcome..." },
      mock: { isEnabled: false, code: "" },
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_node");
    registerGetNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ flowId: "flow-123", nodeId: "node-1" });

    expect(mockClient.readChartNode).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
      nodeId: "node-1",
      preferredLocaleId: undefined,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("node-1");
    expect(parsed.type).toBe("say");
    expect(parsed.config.text).toBe("Hello! Welcome to our service.");
  });

  it("should pass locale ID when provided", async () => {
    mockClient.readChartNode.mockResolvedValue({
      _id: "node-1",
      referenceId: "ref-1",
      type: "say",
      label: "Willkommensnachricht",
      analyticsLabel: "welcome",
      isEntryPoint: true,
      isDisabled: false,
      extension: "basic",
      localeReference: "locale-de",
      comment: "",
      config: { text: "Hallo! Willkommen." },
      preview: {},
      mock: { isEnabled: false, code: "" },
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_node");
    registerGetNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    await handler({ flowId: "flow-123", nodeId: "node-1", localeId: "locale-de" });

    expect(mockClient.readChartNode).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
      nodeId: "node-1",
      preferredLocaleId: "locale-de",
    });
  });
});

describe("search_nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search nodes by text content", async () => {
    mockClient.searchChartNodes.mockResolvedValue({
      items: [
        {
          nodeId: "node-1",
          nodeReferenceId: "ref-1",
          matches: [
            { fieldType: "text", matchPath: "config.text" },
          ],
        },
        {
          nodeId: "node-3",
          nodeReferenceId: "ref-3",
          matches: [
            { fieldType: "text", matchPath: "config.text" },
            { fieldType: "text", matchPath: "label" },
          ],
        },
      ],
      total: 2,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "search_nodes");
    registerSearchNodes(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      query: "welcome",
      localeId: "locale-en",
    });

    expect(mockClient.searchChartNodes).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
      filter: "welcome",
      preferredLocaleId: "locale-en",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flowId).toBe("flow-123");
    expect(parsed.query).toBe("welcome");
    expect(parsed.total).toBe(2);
    expect(parsed.matches).toHaveLength(2);
    expect(parsed.matches[1].matches).toHaveLength(2);
  });
});

describe("get_node_descriptors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list available node types", async () => {
    mockClient.indexNodeDescriptors.mockResolvedValue({
      items: [
        {
          type: "say",
          defaultLabel: "Say",
          summary: "Output a message to the user",
          extension: "basic",
          parentType: null,
          tags: ["output"],
          appearance: {
            color: "#4CAF50",
            textColor: "#FFFFFF",
            showIcon: true,
            variant: "default",
          },
          behavior: { stopping: false, entrypoint: false },
          constraints: {},
          fields: [{ key: "text" }, { key: "data" }],
        },
        {
          type: "question",
          defaultLabel: "Question",
          summary: "Ask the user a question and wait for input",
          extension: "basic",
          parentType: null,
          tags: ["input", "output"],
          appearance: {
            color: "#2196F3",
            textColor: "#FFFFFF",
            showIcon: true,
            variant: "default",
          },
          behavior: { stopping: true, entrypoint: false },
          constraints: {},
          fields: [{ key: "question" }, { key: "slots" }],
        },
      ],
      total: 2,
      nextCursor: null,
      previousCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_node_descriptors");
    registerGetNodeDescriptors(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ flowId: "flow-123" });

    expect(mockClient.indexNodeDescriptors).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flowId).toBe("flow-123");
    expect(parsed.total).toBe(2);
    expect(parsed.descriptors).toHaveLength(2);
    expect(parsed.descriptors[0].type).toBe("say");
    expect(parsed.descriptors[0].fieldCount).toBe(2);
    expect(parsed.descriptors[1].behavior.stopping).toBe(true);
  });
});
