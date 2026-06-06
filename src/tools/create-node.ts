/**
 * create_node tool
 * Creates a new node in a Cognigy.AI flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const nodePositionModes = [
  "append",
  "prepend",
  "appendChild",
  "prependChild",
  "insertChildAt",
  "insertAfter",
  "insertBefore",
] as const;

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID where the node will be created"),
  type: z
    .string()
    .describe("Node type (e.g., 'say', 'question', 'if', 'code', 'executeFlow'). Use get_node_descriptors to list available types."),
  targetNodeId: z
    .string()
    .describe("The ID of the target node relative to which this node will be positioned"),
  mode: z
    .enum(nodePositionModes)
    .default("append")
    .describe("How to position the new node relative to target: append (after), prepend (before), appendChild/prependChild (as child), insertChildAt (at position), insertAfter, insertBefore"),
  position: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Position index when using insertChildAt mode"),
  label: z
    .string()
    .optional()
    .describe("Display label for the node in the flow editor"),
  comment: z
    .string()
    .optional()
    .describe("Developer comment/note for this node"),
  config: z
    .record(z.unknown())
    .optional()
    .describe("Node-specific configuration object. Structure depends on node type."),
  extension: z
    .string()
    .optional()
    .describe("Extension ID if this is a custom extension node"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates the operation without creating the node. Set to false to actually create."),
});

export function registerCreateNode(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_node",
    "Creates a new node in a Cognigy.AI flow. MUTATING: This modifies the flow. Use dryRun=true (default) to validate first. Nodes are the building blocks of conversation logic (Say, Question, If, Code, etc.).",
    inputSchema.shape,
    async (args) => {
      const {
        flowId,
        type,
        targetNodeId,
        mode,
        position,
        label,
        comment,
        config,
        extension,
        dryRun,
      } = inputSchema.parse(args);

      // In dry run mode, validate and return what would be created
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the node.",
                  wouldCreate: {
                    flowId,
                    type,
                    extension: extension || "basic",
                    targetNodeId,
                    mode,
                    position,
                    label,
                    comment,
                    hasConfig: !!config,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Actually create the node
      const createParams: Record<string, unknown> = {
        resourceId: flowId,
        resourceType: "flow",
        type,
        mode,
        target: targetNodeId,
      };

      if (extension) {
        createParams.extension = extension;
      }
      if (position !== undefined) {
        createParams.position = position;
      }
      if (label) {
        createParams.label = label;
      }
      if (comment) {
        createParams.comment = comment;
      }
      if (config) {
        // Spread config into the params (node-specific settings)
        Object.assign(createParams, config);
      }

      const result = await client.createChartNode(createParams as unknown as Parameters<typeof client.createChartNode>[0]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                node: {
                  id: result._id,
                  referenceId: result.referenceId,
                  type: result.type,
                  label: result.label,
                  extension: result.extension,
                  isDisabled: result.isDisabled,
                },
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
