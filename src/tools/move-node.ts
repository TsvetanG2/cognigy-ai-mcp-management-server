/**
 * move_node tool
 * Moves a node to a new position in a Cognigy.AI flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const moveModes = [
  "append",
  "prepend",
  "insertChildAt",
  "insertAfter",
  "insertBefore",
] as const;

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID containing the node"),
  nodeId: z
    .string()
    .describe("The ID of the node to move"),
  targetNodeId: z
    .string()
    .describe("The ID of the target node to move relative to"),
  mode: z
    .enum(moveModes)
    .describe("How to position relative to target: append (as next sibling), prepend (as previous sibling), insertChildAt (as child at position), insertAfter, insertBefore"),
  position: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Position index when using insertChildAt mode"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates the operation without moving. Set to false to actually move the node."),
});

export function registerMoveNode(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "move_node",
    "Moves a node to a new position in a Cognigy.AI flow. MUTATING: This reorganizes the flow structure. Use dryRun=true (default) to validate first. Moving nodes affects execution order.",
    inputSchema.shape,
    async (args) => {
      const { flowId, nodeId, targetNodeId, mode, position, dryRun } =
        inputSchema.parse(args);

      // In dry run mode, verify nodes exist and show what would happen
      if (dryRun) {
        // Verify source node exists
        const sourceNode = await client.readChartNode({
          resourceId: flowId,
          resourceType: "flow",
          nodeId,
        });

        // Verify target node exists
        const targetNode = await client.readChartNode({
          resourceId: flowId,
          resourceType: "flow",
          nodeId: targetNodeId,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to move the node.",
                  wouldMove: {
                    flowId,
                    sourceNode: {
                      id: nodeId,
                      type: sourceNode.type,
                      label: sourceNode.label,
                    },
                    targetNode: {
                      id: targetNodeId,
                      type: targetNode.type,
                      label: targetNode.label,
                    },
                    mode,
                    position: position ?? null,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Actually move the node
      const moveParams: Record<string, unknown> = {
        resourceId: flowId,
        resourceType: "flow",
        nodeId,
        mode,
        target: targetNodeId,
      };

      if (position !== undefined) {
        moveParams.position = position;
      }

      await client.moveChartNode(moveParams as unknown as Parameters<typeof client.moveChartNode>[0]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                moved: true,
                flowId,
                nodeId,
                targetNodeId,
                mode,
                position: position ?? null,
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
