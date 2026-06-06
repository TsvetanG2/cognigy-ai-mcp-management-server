/**
 * run_knowledge_connector tool
 * Triggers a knowledge connector to run immediately.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 300000; // 5 minutes

const inputSchema = z.object({
  connectorId: z
    .string()
    .describe("The knowledge connector ID to run"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the connector"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without running. Set to false to actually run."),
});

export function registerRunKnowledgeConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "run_knowledge_connector",
    "Triggers a Cognigy.AI knowledge connector to run immediately. Pulls content from the external source and creates/updates knowledge chunks. MUTATING: Set dryRun=false to run.",
    inputSchema.shape,
    async (args) => {
      const { connectorId, knowledgeStoreId, dryRun } = inputSchema.parse(args);

      // Verify the connector exists
      const connector = await client.readKnowledgeConnector({ connectorId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to run the connector.",
                  wouldRun: {
                    _id: connector._id,
                    name: connector.name,
                    type: connector.type,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the connector run
      const runResult = await client.runKnowledgeConnector({ connectorId, knowledgeStoreId } as any);

      // If it returns a task, poll for completion
      const taskId = (runResult as { _id?: string })?._id;
      if (taskId) {
        const startTime = Date.now();

        while (Date.now() - startTime < MAX_POLL_TIME) {
          const task = await client.readTask({ taskId }) as unknown as Record<string, unknown>;

          if (task.status === "done") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      completed: true,
                      connector: {
                        _id: connector._id,
                        name: connector.name,
                        type: connector.type,
                      },
                      taskId,
                      status: "done",
                      message: "Connector run completed successfully.",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          if (task.status === "error") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      completed: false,
                      connector: {
                        _id: connector._id,
                        name: connector.name,
                      },
                      taskId,
                      status: "error",
                      error: task.failReason || "Unknown error",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  completed: false,
                  connector: {
                    _id: connector._id,
                    name: connector.name,
                  },
                  taskId,
                  status: "timeout",
                  message: "Connector run started but did not complete within timeout. Use get_task to check status.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // No task ID returned, assume immediate completion
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                completed: true,
                connector: {
                  _id: connector._id,
                  name: connector.name,
                  type: connector.type,
                },
                message: "Connector run triggered.",
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
