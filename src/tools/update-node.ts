/**
 * update_node tool
 * Updates an existing node in a Cognigy.AI flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID containing the node"),
  nodeId: z
    .string()
    .describe("The ID of the node to update"),
  label: z
    .string()
    .optional()
    .describe("New display label for the node"),
  comment: z
    .string()
    .optional()
    .describe("New developer comment/note"),
  analyticsLabel: z
    .string()
    .optional()
    .describe("Label used in analytics reporting"),
  isDisabled: z
    .boolean()
    .optional()
    .describe("Whether the node is disabled (skipped during execution)"),
  config: z
    .record(z.unknown())
    .optional()
    .describe("Node-specific configuration to update. Structure depends on node type. Only provided fields are updated."),
  localeId: z
    .string()
    .optional()
    .describe("Locale ID if updating locale-specific content"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates the operation without updating. Set to false to actually update."),
});

export function registerUpdateNode(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_node",
    "Updates an existing node in a Cognigy.AI flow. MUTATING: This modifies the node. Use dryRun=true (default) to validate first. Only provided fields are updated; others remain unchanged.",
    inputSchema.shape,
    async (args) => {
      const {
        flowId,
        nodeId,
        label,
        comment,
        analyticsLabel,
        isDisabled,
        config,
        localeId,
        dryRun,
      } = inputSchema.parse(args);

      // Build the update payload with only provided fields
      const updates: Record<string, unknown> = {};
      if (label !== undefined) updates.label = label;
      if (comment !== undefined) updates.comment = comment;
      if (analyticsLabel !== undefined) updates.analyticsLabel = analyticsLabel;
      if (isDisabled !== undefined) updates.isDisabled = isDisabled;
      if (localeId !== undefined) updates.localeId = localeId;
      if (config) {
        Object.assign(updates, config);
      }

      const updateCount = Object.keys(updates).length;
      if (updateCount === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No updates specified. Provide at least one field to update.",
              }),
            },
          ],
          isError: true,
        };
      }

      // In dry run mode, show what would be updated
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to apply the update.",
                  wouldUpdate: {
                    flowId,
                    nodeId,
                    fieldsToUpdate: Object.keys(updates),
                    updates,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Actually update the node
      await client.updateChartNode({
        resourceId: flowId,
        resourceType: "flow",
        nodeId,
        ...updates,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                flowId,
                nodeId,
                fieldsUpdated: Object.keys(updates),
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
