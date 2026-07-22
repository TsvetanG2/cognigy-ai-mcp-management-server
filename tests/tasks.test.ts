/**
 * Unit tests for Task tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListTasks } from "../src/tools/list-tasks.js";
import { registerGetTask } from "../src/tools/get-task.js";
import type { Config } from "../src/config.js";

const mockClient = {
  indexTasks: vi.fn(),
  readTask: vi.fn(),
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

describe("list_tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list tasks in a project with pagination", async () => {
    mockClient.indexTasks.mockResolvedValue({
      items: [
        {
          _id: "task-1",
          name: "createSnapshot",
          status: "done",
          currentStep: 3,
          totalStep: 3,
          data: { name: "v1.0.0" },
          createdAt: 1699000000000,
          lastChanged: 1699000010000,
        },
        {
          _id: "task-2",
          name: "trainIntents",
          status: "active",
          currentStep: 2,
          totalStep: 5,
          data: { flowId: "flow-1" },
          createdAt: 1699000020000,
          lastChanged: 1699000030000,
        },
      ],
      total: 2,
      nextCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "list_tasks");
    registerListTasks(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ projectId: "project-123", limit: 25 });

    expect(mockClient.indexTasks).toHaveBeenCalledWith({
      projectId: "project-123",
      limit: 25,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.projectId).toBe("project-123");
    expect(parsed.total).toBe(2);
    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0].name).toBe("createSnapshot");
    expect(parsed.tasks[0].status).toBe("done");
    expect(parsed.tasks[1].status).toBe("active");
  });
});

describe("get_task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a single task with full details", async () => {
    mockClient.readTask.mockResolvedValue({
      _id: "task-1",
      status: "done",
      currentStep: 3,
      totalStep: 3,
      failReason: "",
      lastRunAt: new Date("2024-01-15T10:00:05Z"),
      lastFinishedAt: new Date("2024-01-15T10:00:10Z"),
      createdAt: 1699000000000,
      lastChanged: 1699000010000,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_task");
    registerGetTask(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ taskId: "task-1" });

    expect(mockClient.readTask).toHaveBeenCalledWith({
      taskId: "task-1",
      projectId: "project-123",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("task-1");
    expect(parsed.status).toBe("done");
    expect(parsed.currentStep).toBe(3);
    expect(parsed.totalStep).toBe(3);
    expect(parsed.failReason).toBeUndefined();
  });

  it("should include failReason when task failed", async () => {
    mockClient.readTask.mockResolvedValue({
      _id: "task-2",
      status: "error",
      currentStep: 2,
      totalStep: 5,
      failReason: "NLU training failed: insufficient examples",
      lastRunAt: new Date("2024-01-15T10:00:05Z"),
      lastFinishedAt: new Date("2024-01-15T10:00:10Z"),
      createdAt: 1699000000000,
      lastChanged: 1699000010000,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_task");
    registerGetTask(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ taskId: "task-2" });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("error");
    expect(parsed.failReason).toBe("NLU training failed: insufficient examples");
  });
});
