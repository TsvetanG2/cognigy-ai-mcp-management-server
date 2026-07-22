/**
 * Unit tests for Session tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInjectContext } from "../src/tools/inject-context.js";
import { registerResetContext } from "../src/tools/reset-context.js";
import type { Config } from "../src/config.js";

const mockClient = {
  injectContext: vi.fn(),
  resetContext: vi.fn(),
};

const mockConfig: Config = {
  cognigyBaseUrl: "https://api-trial.cognigy.ai",
  cognigyApiKey: "test-api-key",
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

describe("inject_context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should inject context into a session", async () => {
    mockClient.injectContext.mockResolvedValue({
      userName: "John",
      userAge: 30,
      preferences: { theme: "dark" },
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "inject_context");
    registerInjectContext(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      sessionId: "session-123",
      userId: "user-456",
      context: { userName: "John", userAge: 30, preferences: { theme: "dark" } },
    });

    expect(mockClient.injectContext).toHaveBeenCalledWith({
      sessionId: "session-123",
      userId: "user-456",
      context: { userName: "John", userAge: 30, preferences: { theme: "dark" } },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sessionId).toBe("session-123");
    expect(parsed.userId).toBe("user-456");
    expect(parsed.injected).toBe(true);
    expect(parsed.context.userName).toBe("John");
  });
});

describe("reset_context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reset context for a session", async () => {
    mockClient.resetContext.mockResolvedValue({});

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "reset_context");
    registerResetContext(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      sessionId: "session-123",
      userId: "user-456",
      flowReferenceId: "flow-ref-789",
      entrypoint: "project-000",
    });

    expect(mockClient.resetContext).toHaveBeenCalledWith({
      sessionId: "session-123",
      userId: "user-456",
      flowReferenceId: "flow-ref-789",
      entrypoint: "project-000",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sessionId).toBe("session-123");
    expect(parsed.userId).toBe("user-456");
    expect(parsed.reset).toBe(true);
  });
});
