/**
 * list_flows tool
 * Lists all flows in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to list flows from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of flows to return (1-100, default 25)"),
});

export function registerListFlows(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "list_flows",
    "Lists all flows in a Cognigy.AI project. Flows are conversation logic containers. Use this to discover flows before reading or modifying them.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      if (!projectId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "projectId is required. Either provide it as a parameter or set COGNIGY_DEFAULT_PROJECT_ID environment variable.",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = await client.indexFlows({
        projectId,
        limit: parsed.limit,
      });

      const flows = result.items.map((flow) => ({
        id: flow._id,
        name: flow.name,
        createdAt: flow.createdAt,
        lastChanged: flow.lastChanged,
        isTrainingOutOfDate: flow.isTrainingOutOfDate,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                total: result.total,
                returned: flows.length,
                flows,
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
