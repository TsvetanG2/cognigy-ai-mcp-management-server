/**
 * Unit tests for Conversation tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetConversations } from "../src/tools/get-conversations.js";
import { registerGetConversation } from "../src/tools/get-conversation.js";
import { registerGetTranscript } from "../src/tools/get-transcript.js";
import type { Config } from "../src/config.js";

const mockClient = {
  indexConversations: vi.fn(),
  readConversation: vi.fn(),
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

describe("get_conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list conversations for contact IDs", async () => {
    mockClient.indexConversations.mockResolvedValue({
      items: [
        {
          sessionId: "session-1",
          contactId: "contact-1",
          projectId: "project-123",
          projectName: "Test Project",
          flowName: "Main Flow",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          inputText: "Hello",
          type: "input",
          source: "user",
          inHandoverRequest: false,
          inHandoverConversation: false,
        },
      ],
      total: 1,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_conversations");
    registerGetConversations(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      projectId: "project-123",
      contactIds: ["contact-1"],
    });

    expect(mockClient.indexConversations).toHaveBeenCalledWith({
      projectId: "project-123",
      contactIds: ["contact-1"],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.projectId).toBe("project-123");
    expect(parsed.total).toBe(1);
    expect(parsed.conversations).toHaveLength(1);
    expect(parsed.conversations[0].sessionId).toBe("session-1");
  });
});

describe("get_conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get conversation details for a session", async () => {
    mockClient.readConversation.mockResolvedValue({
      items: [
        {
          inputId: "input-1",
          sessionId: "session-123",
          contactId: "contact-1",
          inputText: "Hello",
          type: "input",
          source: "user",
          flowName: "Main Flow",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          endpointName: "Webchat",
          localeName: "English",
          inHandoverRequest: false,
          inHandoverConversation: false,
          rating: 0,
          ratingComment: "",
        },
        {
          inputId: "input-2",
          sessionId: "session-123",
          contactId: "contact-1",
          inputText: "Hello! How can I help?",
          type: "output",
          source: "bot",
          flowName: "Main Flow",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:01Z"),
          endpointName: "Webchat",
          localeName: "English",
          inHandoverRequest: false,
          inHandoverConversation: false,
          rating: 0,
          ratingComment: "",
        },
      ],
      total: 2,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_conversation");
    registerGetConversation(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ sessionId: "session-123" });

    expect(mockClient.readConversation).toHaveBeenCalledWith({
      sessionId: "session-123",
      projectId: "project-123",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sessionId).toBe("session-123");
    expect(parsed.total).toBe(2);
    expect(parsed.entries).toHaveLength(2);
  });
});

describe("get_transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should assemble a compact transcript", async () => {
    mockClient.readConversation.mockResolvedValue({
      items: [
        {
          inputId: "input-1",
          sessionId: "session-123",
          inputText: "Hello",
          type: "input",
          source: "user",
          flowName: "Main",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          inHandoverConversation: false,
        },
        {
          inputId: "input-2",
          sessionId: "session-123",
          inputText: "Hi there! How can I help?",
          type: "output",
          source: "bot",
          flowName: "Main",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:01Z"),
          inHandoverConversation: false,
        },
        {
          inputId: "input-3",
          sessionId: "session-123",
          inputText: "I need help with my order",
          type: "input",
          source: "user",
          flowName: "Main",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:02Z"),
          inHandoverConversation: false,
        },
      ],
      total: 3,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_transcript");
    registerGetTranscript(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ sessionId: "session-123", format: "compact" });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sessionId).toBe("session-123");
    expect(parsed.messageCount).toBe(3);
    expect(parsed.transcript).toHaveLength(3);
    expect(parsed.transcript[0]).toBe("[USER] Hello");
    expect(parsed.transcript[1]).toBe("[BOT] Hi there! How can I help?");
    expect(parsed.transcript[2]).toBe("[USER] I need help with my order");
  });

  it("should assemble a full transcript with metadata", async () => {
    mockClient.readConversation.mockResolvedValue({
      items: [
        {
          inputId: "input-1",
          sessionId: "session-123",
          inputText: "Hello",
          type: "input",
          source: "user",
          flowName: "Main",
          channel: "webchat",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          inHandoverConversation: false,
        },
      ],
      total: 1,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_transcript");
    registerGetTranscript(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ sessionId: "session-123", format: "full" });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sessionId).toBe("session-123");
    expect(parsed.channel).toBe("webchat");
    expect(parsed.flowName).toBe("Main");
    expect(parsed.transcript[0].speaker).toBe("USER");
    expect(parsed.transcript[0].text).toBe("Hello");
    expect(parsed.transcript[0].type).toBe("input");
  });
});
