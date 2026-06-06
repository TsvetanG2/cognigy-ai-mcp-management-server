/**
 * Unit tests for Intent authoring tools (Phase 2).
 * Tests mutating operations with dryRun behavior and async training.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCreateIntent } from "../src/tools/create-intent.js";
import { registerUpdateIntent } from "../src/tools/update-intent.js";
import { registerDeleteIntent } from "../src/tools/delete-intent.js";
import { registerTrainIntents } from "../src/tools/train-intents.js";
import type { Config } from "../src/config.js";

// Mock Cognigy client
const mockClient = {
  createIntent: vi.fn(),
  updateIntent: vi.fn(),
  deleteIntent: vi.fn(),
  readIntent: vi.fn(),
  trainIntents: vi.fn(),
  readTask: vi.fn(),
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

describe("create_intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate in dryRun mode without creating", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "create_intent");
    registerCreateIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      name: "OrderPizza",
      description: "User wants to order pizza",
      exampleSentences: ["I want pizza", "Order a pizza"],
      dryRun: true,
    });

    // Should NOT call the client in dryRun mode
    expect(mockClient.createIntent).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldCreate.flowId).toBe("flow-123");
    expect(parsed.wouldCreate.name).toBe("OrderPizza");
    expect(parsed.wouldCreate.exampleSentenceCount).toBe(2);
  });

  it("should default to dryRun=true", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "create_intent");
    registerCreateIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      name: "BookFlight",
      // No dryRun specified - should default to true
    });

    expect(mockClient.createIntent).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
  });

  it("should create intent when dryRun=false", async () => {
    mockClient.createIntent.mockResolvedValue({
      _id: "intent-new-id",
      referenceId: "ref-intent-new",
      name: "OrderPizza",
      description: "User wants to order pizza",
      isDisabled: false,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "create_intent");
    registerCreateIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      name: "OrderPizza",
      description: "User wants to order pizza",
      exampleSentences: ["I want pizza"],
      tags: ["food", "order"],
      dryRun: false,
    });

    expect(mockClient.createIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: "flow-123",
        name: "OrderPizza",
        description: "User wants to order pizza",
        tags: ["food", "order"],
      })
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.created).toBe(true);
    expect(parsed.intent.id).toBe("intent-new-id");
    expect(parsed.intent.name).toBe("OrderPizza");
    expect(parsed.nextStep).toContain("train_intents");
  });
});

describe("update_intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate in dryRun mode without updating", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "update_intent");
    registerUpdateIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      intentId: "intent-1",
      name: "UpdatedIntent",
      description: "Updated description",
      dryRun: true,
    });

    expect(mockClient.updateIntent).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldUpdate.fieldsToUpdate).toContain("name");
    expect(parsed.wouldUpdate.fieldsToUpdate).toContain("description");
  });

  it("should reject when no updates specified", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "update_intent");
    registerUpdateIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      intentId: "intent-1",
      dryRun: true,
      // No actual updates
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("No updates specified");
  });

  it("should update intent when dryRun=false", async () => {
    mockClient.updateIntent.mockResolvedValue({});

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "update_intent");
    registerUpdateIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      intentId: "intent-1",
      name: "NewIntentName",
      isDisabled: true,
      dryRun: false,
    });

    expect(mockClient.updateIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: "flow-123",
        intentId: "intent-1",
        name: "NewIntentName",
        isDisabled: true,
      })
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.updated).toBe(true);
    expect(parsed.fieldsUpdated).toContain("name");
    expect(parsed.fieldsUpdated).toContain("isDisabled");
  });
});

describe("delete_intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify intent exists in dryRun mode", async () => {
    mockClient.readIntent.mockResolvedValue({
      _id: "intent-1",
      name: "OrderPizza",
      description: "User wants pizza",
      isDisabled: false,
      tags: ["food"],
      isRejectIntent: false,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "delete_intent");
    registerDeleteIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      intentId: "intent-1",
      dryRun: true,
    });

    expect(mockClient.readIntent).toHaveBeenCalledWith({
      flowId: "flow-123",
      intentId: "intent-1",
    });
    expect(mockClient.deleteIntent).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldDelete.name).toBe("OrderPizza");
    expect(parsed.wouldDelete.tags).toEqual(["food"]);
    expect(parsed.message).toContain("cannot be undone");
  });

  it("should default to dryRun=true", async () => {
    mockClient.readIntent.mockResolvedValue({
      _id: "intent-1",
      name: "TestIntent",
      description: "Test",
      isDisabled: false,
      tags: [],
      isRejectIntent: false,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "delete_intent");
    registerDeleteIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      intentId: "intent-1",
      // No dryRun specified - should default to true
    });

    expect(mockClient.deleteIntent).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
  });

  it("should delete intent when dryRun=false", async () => {
    mockClient.deleteIntent.mockResolvedValue({});

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "delete_intent");
    registerDeleteIntent(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      intentId: "intent-1",
      dryRun: false,
    });

    expect(mockClient.deleteIntent).toHaveBeenCalledWith({
      flowId: "flow-123",
      intentId: "intent-1",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.deleted).toBe(true);
    expect(parsed.intentId).toBe("intent-1");
    expect(parsed.nextStep).toContain("train_intents");
  });
});

describe("train_intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate in dryRun mode without training", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      mode: "full",
      dryRun: true,
    });

    expect(mockClient.trainIntents).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.wouldTrain.flowId).toBe("flow-123");
    expect(parsed.wouldTrain.mode).toBe("full");
  });

  it("should default to dryRun=true", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      // No dryRun specified - should default to true
    });

    expect(mockClient.trainIntents).not.toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.dryRun).toBe(true);
  });

  it("should train and poll until completion", async () => {
    vi.useFakeTimers();

    mockClient.trainIntents.mockResolvedValue({
      _id: "task-123",
      status: "queued",
    });

    // First poll: still running, second poll: done
    mockClient.readTask
      .mockResolvedValueOnce({ _id: "task-123", status: "running" })
      .mockResolvedValueOnce({ _id: "task-123", status: "done" });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const handlerPromise = handler({
      flowId: "flow-123",
      mode: "full",
      pollIntervalMs: 1000,
      timeoutMs: 60000,
      dryRun: false,
    });

    // Advance time through poll intervals
    await vi.advanceTimersByTimeAsync(3000);

    const result = await handlerPromise;

    expect(mockClient.trainIntents).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: "flow-123",
        mode: "full",
      })
    );
    expect(mockClient.readTask).toHaveBeenCalled();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.trained).toBe(true);
    expect(parsed.status).toBe("done");
    expect(parsed.taskId).toBe("task-123");

    vi.useRealTimers();
  });

  it("should handle training error", async () => {
    // Return error status immediately (terminal state, no polling needed)
    mockClient.trainIntents.mockResolvedValue({
      _id: "task-456",
      status: "error",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      mode: "full",
      dryRun: false,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.trained).toBe(false);
    expect(parsed.status).toBe("error");
    // failReason comes from task (null when initial response is terminal), defaults to "Unknown error"
    expect(parsed.failReason).toBe("Unknown error");
  });

  it("should handle training timeout", async () => {
    vi.useFakeTimers();

    mockClient.trainIntents.mockResolvedValue({
      _id: "task-789",
      status: "queued",
    });

    // Always return running status to simulate timeout
    mockClient.readTask.mockResolvedValue({
      _id: "task-789",
      status: "running",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const handlerPromise = handler({
      flowId: "flow-123",
      mode: "quick",
      pollIntervalMs: 1000,
      timeoutMs: 5000,
      dryRun: false,
    });

    // Advance time past the timeout
    await vi.advanceTimersByTimeAsync(10000);

    const result = await handlerPromise;

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.trained).toBe(false);
    expect(parsed.status).toBe("timeout");
    expect(parsed.taskId).toBe("task-789");
    expect(parsed.message).toContain("did not complete");

    vi.useRealTimers();
  });

  it("should handle training cancellation", async () => {
    // Return cancelled status immediately (terminal state, no polling needed)
    mockClient.trainIntents.mockResolvedValue({
      _id: "task-abc",
      status: "cancelled",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      dryRun: false,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.trained).toBe(false);
    expect(parsed.status).toBe("cancelled");
    expect(parsed.message).toContain("cancelled");
  });

  it("should support locale-specific training", async () => {
    mockClient.trainIntents.mockResolvedValue({
      _id: "task-locale",
      status: "done",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "train_intents");
    registerTrainIntents(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      flowId: "flow-123",
      localeId: "locale-de",
      mode: "quick",
      dryRun: false,
    });

    expect(mockClient.trainIntents).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: "flow-123",
        localeId: "locale-de",
        mode: "quick",
      })
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.trained).toBe(true);
    expect(parsed.localeId).toBe("locale-de");
  });
});
