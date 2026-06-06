/**
 * delete_node tool
 * Deletes a node from a Cognigy.AI flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID containing the node to delete"),
  nodeId: z
    .string()
    .describe("The ID of the node to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates the operation without deleting. Set to false to actually delete. WARNING: Deletion cannot be undone via API."),
});

export function registerDeleteNode(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_node",
    "Deletes a node from a Cognigy.AI flow. MUTATING & DESTRUCTIVE: This permanently removes the node. Use dryRun=true (default) to validate first. Child nodes may also be affected.",
    inputSchema.shape,
    async (args) => {
      const { flowId, nodeId, dryRun } = inputSchema.parse(args);

      // In dry run mode, verify the node exists and show what would be deleted
      if (dryRun) {
        // Fetch the node to verify it exists and show its details
        const node = await client.readChartNode({
          resourceId: flowId,
          resourceType: "flow",
          nodeId,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Node found. Set dryRun=false to delete it. WARNING: This cannot be undone.",
                  wouldDelete: {
                    flowId,
                    nodeId,
                    type: node.type,
                    label: node.label,
                    extension: node.extension,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Actually delete the node
      await client.deleteChartNode({
        resourceId: flowId,
        resourceType: "flow",
        nodeId,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                flowId,
                nodeId,
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
