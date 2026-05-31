/**
 * Unit tests for Snapshot tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListSnapshots } from "../src/tools/list-snapshots.js";
import { registerGetSnapshot } from "../src/tools/get-snapshot.js";
import { registerGetSnapshotResources } from "../src/tools/get-snapshot-resources.js";
import type { Config } from "../src/config.js";

const mockClient = {
  indexSnapshots: vi.fn(),
  readSnapshot: vi.fn(),
  indexResourcesInSnapshot: vi.fn(),
};

const mockConfig: Config = {
  cognigyBaseUrl: "https://api-trial.cognigy.ai",
  cognigyApiKey: "test-api-key",
  defaultProjectId: "project-123",
};

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

describe("list_snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list snapshots in a project with pagination", async () => {
    mockClient.indexSnapshots.mockResolvedValue({
      items: [
        {
          _id: "snap-1",
          name: "v1.0.0",
          description: "Initial release",
          hash: "abc123",
          isPackaged: true,
          packageExpiresAt: 1700000000000,
          createdAt: 1699000000000,
          createdBy: "user-1",
        },
        {
          _id: "snap-2",
          name: "v1.1.0",
          description: "Bug fixes",
          hash: "def456",
          isPackaged: false,
          packageExpiresAt: 0,
          createdAt: 1699100000000,
          createdBy: "user-1",
        },
      ],
      total: 2,
      nextCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "list_snapshots");
    registerListSnapshots(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ projectId: "project-123", limit: 25 });

    expect(mockClient.indexSnapshots).toHaveBeenCalledWith({
      projectId: "project-123",
      limit: 25,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.projectId).toBe("project-123");
    expect(parsed.total).toBe(2);
    expect(parsed.snapshots).toHaveLength(2);
    expect(parsed.snapshots[0].name).toBe("v1.0.0");
    expect(parsed.snapshots[0].isPackaged).toBe(true);
    expect(parsed.snapshots[1].name).toBe("v1.1.0");
  });
});

describe("get_snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get a single snapshot with details", async () => {
    mockClient.readSnapshot.mockResolvedValue({
      _id: "snap-1",
      name: "v1.0.0",
      description: "Initial production release",
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_snapshot");
    registerGetSnapshot(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({ snapshotId: "snap-1" });

    expect(mockClient.readSnapshot).toHaveBeenCalledWith({
      snapshotId: "snap-1",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("snap-1");
    expect(parsed.name).toBe("v1.0.0");
    expect(parsed.description).toBe("Initial production release");
  });
});

describe("get_snapshot_resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list resources in a snapshot by type", async () => {
    mockClient.indexResourcesInSnapshot.mockResolvedValue({
      items: [
        {
          _id: "flow-1",
          referenceId: "ref-flow-1",
          name: "Main Flow",
          resourceType: "flow",
        },
        {
          _id: "flow-2",
          referenceId: "ref-flow-2",
          name: "Fallback Flow",
          resourceType: "flow",
        },
      ],
      total: 2,
      nextCursor: null,
    });

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const getHandler = captureToolHandler(server, "get_snapshot_resources");
    registerGetSnapshotResources(server, mockClient as any, mockConfig);

    const handler = getHandler();
    const result = await handler({
      snapshotId: "snap-1",
      resourceType: "flow",
      limit: 25,
    });

    expect(mockClient.indexResourcesInSnapshot).toHaveBeenCalledWith({
      snapshotId: "snap-1",
      resourceType: "flow",
      limit: 25,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.snapshotId).toBe("snap-1");
    expect(parsed.resourceType).toBe("flow");
    expect(parsed.total).toBe(2);
    expect(parsed.resources).toHaveLength(2);
    expect(parsed.resources[0].name).toBe("Main Flow");
    expect(parsed.resources[1].name).toBe("Fallback Flow");
  });
});
