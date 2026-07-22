/**
 * get_nodes tool
 * Lists all nodes in a flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to list nodes from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of nodes to return (1-100, default 25)"),
});

export function registerGetNodes(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_nodes",
    "Lists all nodes in a Cognigy.AI flow. Nodes are the building blocks of conversation logic (Say, Question, If, Code, etc.). Use this to explore flow structure before reading specific nodes or modifying the flow.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId, limit } = inputSchema.parse(args);

      const result = await client.indexChartNodes({
        resourceId: flowId,
        resourceType: "flow",
        limit,
      });

      const nodes = result.items.map((node) => ({
        id: node._id,
        referenceId: node.referenceId,
        type: node.type,
        label: node.label,
        analyticsLabel: node.analyticsLabel,
        isEntryPoint: node.isEntryPoint,
        isDisabled: node.isDisabled,
        extension: node.extension,
        comment: node.comment || undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                flowId,
                total: result.total,
                returned: nodes.length,
                nextCursor: result.nextCursor,
                nodes,
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
