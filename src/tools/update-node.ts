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
    .record(z.string(), z.unknown())
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Merge nested objects key by key; arrays and primitives in `patch` replace the base value
function deepMerge(base: Record<string, unknown> | undefined, patch: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = isPlainObject(value) && isPlainObject(merged[key])
      ? deepMerge(merged[key] as Record<string, unknown>, value)
      : value;
  }
  return merged;
}

export function registerUpdateNode(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_node",
    "Updates an existing node in a Cognigy.AI flow. MUTATING: This modifies the node. Use dryRun=true (default) to validate first. Only provided fields are updated; others remain unchanged.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
      if (config) updates.config = config;

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

      // The API replaces config wholesale, so merge the provided keys over the current config
      if (config) {
        const current = await client.readChartNode({
          resourceId: flowId,
          resourceType: "flow",
          nodeId,
          preferredLocaleId: localeId,
        });
        updates.config = deepMerge(current.config as Record<string, unknown>, config);
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
