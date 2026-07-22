/**
 * get_task tool
 * Gets detailed information about a specific async task.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  taskId: z
    .string()
    .describe("The task ID to retrieve"),
  projectId: z
    .string()
    .optional()
    .describe("Optional project ID to scope the query"),
});

export function registerGetTask(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "get_task",
    "Gets detailed status of a specific Cognigy.AI async task. Returns progress, status, and failure reason if applicable. Use this to poll long-running operations to completion.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      const task = await client.readTask({
        taskId: parsed.taskId,
        projectId,
      });

      const result = {
        id: task._id,
        status: task.status,
        currentStep: task.currentStep,
        totalStep: task.totalStep,
        failReason: task.failReason || undefined,
        lastRunAt: task.lastRunAt,
        lastFinishedAt: task.lastFinishedAt,
        createdAt: task.createdAt,
        lastChanged: task.lastChanged,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
