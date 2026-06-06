/**
 * Unit tests for Node authoring tools (Phase 2).
 * Tests mutating operations with dryRun behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCreateNode } from "../src/tools/create-node.js";
import { registerUpdateNode } from "../src/tools/update-node.js";
import { registerDeleteNode } from "../src/tools/delete-node.js";
import { registerMoveNode } from "../src/tools/move-node.js";
import { registerGenerateNodeOutput } from "../src/tools/generate-node-output.js";
import type { Config } from "../src/config.js";

// Mock Cognigy client
const mockClient = {
  createChartNode: vi.fn(),
  updateChartNode: vi.fn(),
  deleteChartNode: vi.fn(),
  readChartNode: vi.fn(),
  moveChartNode: vi.fn(),
  generateNodeOutput: vi.fn(),
};

const mockConfig: Config = {
  cognigyBaseUrl: "https://api-trial.cognigy.ai",
  cognigyApiKey: "test-api-key",
};

// Helper to capture registered tool handler
function captureToolHandler(server: McpServer, toolName: string) {
  const toolCalls: Array<{ name: string; handler: Function }> = [];
  const originalTool = server.tool.bind(server);

  vi.spyOn(server, "tool").mockImplementation((name, description, schema, handler) => {
    toolCalls.push({ name: name as string, handler: handler as Function });
    return originalTool(name, description, schema, handler);
  });

  return () => {
    const found = toolCalls.find((t) => t.name === toolName);
    if (!found) throw new Error(`Tool ${toolName} not found`);
    return found.handler;
  };
}

describe("create_node", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate in dryRun mode without creating", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "create_node");
    registerCreateNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      type: "say",
      targetNodeId: "node-1",
      mode: "append",
      label: "Test Say",
      dryRun: true,
    });

    // Should NOT call the client in dryRun mode
    expect(mockClient.createChartNode).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldCreate.flowId).toBe("flow-123");
    expect(parsed.wouldCreate.type).toBe("say");
    expect(parsed.wouldCreate.mode).toBe("append");
  });

  it("should default to dryRun=true", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "create_node");
    registerCreateNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      type: "say",
      targetNodeId: "node-1",
      // No dryRun specified - should default to true
    });

    expect(mockClient.createChartNode).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
  });

  it("should create node when dryRun=false", async () => {
    mockClient.createChartNode.mockResolvedValue({
      _id: "new-node-id",
      referenceId: "ref-new",
      type: "say",
      label: "Test Say",
      extension: "basic",
      isDisabled: false,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "create_node");
    registerCreateNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      type: "say",
      targetNodeId: "node-1",
      mode: "append",
      label: "Test Say",
      dryRun: false,
    });

    expect(mockClient.createChartNode).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "flow-123",
        resourceType: "flow",
        type: "say",
        mode: "append",
        target: "node-1",
        label: "Test Say",
      })
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.created).toBe(true);
    expect(parsed.node.id).toBe("new-node-id");
    expect(parsed.node.type).toBe("say");
  });
});

describe("update_node", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate in dryRun mode without updating", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "update_node");
    registerUpdateNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      label: "Updated Label",
      isDisabled: true,
      dryRun: true,
    });

    expect(mockClient.updateChartNode).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldUpdate.fieldsToUpdate).toContain("label");
    expect(parsed.wouldUpdate.fieldsToUpdate).toContain("isDisabled");
  });

  it("should reject when no updates specified", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "update_node");
    registerUpdateNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      dryRun: true,
      // No actual updates
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("No updates specified");
  });

  it("should update node when dryRun=false", async () => {
    mockClient.updateChartNode.mockResolvedValue({});

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "update_node");
    registerUpdateNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      label: "New Label",
      comment: "Updated via MCP",
      dryRun: false,
    });

    expect(mockClient.updateChartNode).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
      nodeId: "node-1",
      label: "New Label",
      comment: "Updated via MCP",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.updated).toBe(true);
    expect(parsed.fieldsUpdated).toContain("label");
    expect(parsed.fieldsUpdated).toContain("comment");
  });
});

describe("delete_node", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify node exists in dryRun mode", async () => {
    mockClient.readChartNode.mockResolvedValue({
      _id: "node-1",
      type: "say",
      label: "Welcome",
      extension: "basic",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "delete_node");
    registerDeleteNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      dryRun: true,
    });

    expect(mockClient.readChartNode).toHaveBeenCalled();
    expect(mockClient.deleteChartNode).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldDelete.type).toBe("say");
    expect(parsed.wouldDelete.label).toBe("Welcome");
  });

  it("should delete node when dryRun=false", async () => {
    mockClient.deleteChartNode.mockResolvedValue({});

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "delete_node");
    registerDeleteNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      dryRun: false,
    });

    expect(mockClient.deleteChartNode).toHaveBeenCalledWith({
      resourceId: "flow-123",
      resourceType: "flow",
      nodeId: "node-1",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.deleted).toBe(true);
    expect(parsed.nodeId).toBe("node-1");
  });
});

describe("move_node", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify both nodes exist in dryRun mode", async () => {
    mockClient.readChartNode
      .mockResolvedValueOnce({
        _id: "node-1",
        type: "say",
        label: "Source Node",
      })
      .mockResolvedValueOnce({
        _id: "node-2",
        type: "question",
        label: "Target Node",
      });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "move_node");
    registerMoveNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      targetNodeId: "node-2",
      mode: "insertAfter",
      dryRun: true,
    });

    expect(mockClient.readChartNode).toHaveBeenCalledTimes(2);
    expect(mockClient.moveChartNode).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldMove.sourceNode.type).toBe("say");
    expect(parsed.wouldMove.targetNode.type).toBe("question");
    expect(parsed.wouldMove.mode).toBe("insertAfter");
  });

  it("should move node when dryRun=false", async () => {
    mockClient.moveChartNode.mockResolvedValue({});

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "move_node");
    registerMoveNode(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      nodeId: "node-1",
      targetNodeId: "node-2",
      mode: "append",
      dryRun: false,
    });

    expect(mockClient.moveChartNode).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "flow-123",
        resourceType: "flow",
        nodeId: "node-1",
        mode: "append",
        target: "node-2",
      })
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.moved).toBe(true);
    expect(parsed.mode).toBe("append");
  });
});

describe("generate_node_output", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate text content", async () => {
    mockClient.generateNodeOutput.mockResolvedValue({
      output: ["Hello, welcome to our service!", "Hi there, how can I help?"],
      outputType: "text",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "generate_node_output");
    registerGenerateNodeOutput(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      localeId: "locale-en",
      prompt: "greeting for banking bot",
      outputType: "text",
      generateContentLimit: 2,
    });

    expect(mockClient.generateNodeOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: "flow-123",
        localeId: "locale-en",
        userText: "greeting for banking bot",
        outputType: "text",
        generateContentLimit: 2,
      })
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.outputType).toBe("text");
    expect(parsed.generated).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it("should generate adaptive card content", async () => {
    mockClient.generateNodeOutput.mockResolvedValue({
      output: {
        type: "AdaptiveCard",
        body: [{ type: "TextBlock", text: "Poll: When to meet?" }],
        actions: [{ type: "Action.Submit", title: "Submit" }],
        version: "1.4",
      },
      outputType: "adaptiveCard",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "generate_node_output");
    registerGenerateNodeOutput(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      localeId: "locale-en",
      prompt: "create a poll for scheduling a meeting",
      outputType: "adaptiveCard",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.outputType).toBe("adaptiveCard");
    expect(parsed.generated.type).toBe("AdaptiveCard");
    expect(parsed.generated.body).toBeDefined();
  });
});
