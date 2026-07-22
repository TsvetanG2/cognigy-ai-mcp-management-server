/**
 * list_tasks tool
 * Lists async tasks in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Optional project ID to filter tasks"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of tasks to return (1-100, default 25)"),
});

export function registerListTasks(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "list_tasks",
    "Lists async tasks in Cognigy.AI. Tasks track long-running operations like snapshot creation, training, and imports. Use this to monitor background job status.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      const result = await client.indexTasks({
        projectId,
        limit: parsed.limit,
      });

      const tasks = result.items.map((task) => ({
        id: task._id,
        name: task.name,
        status: task.status,
        currentStep: task.currentStep,
        totalStep: task.totalStep,
        data: task.data,
        createdAt: task.createdAt,
        lastChanged: task.lastChanged,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                total: result.total,
                returned: tasks.length,
                nextCursor: result.nextCursor,
                tasks,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
