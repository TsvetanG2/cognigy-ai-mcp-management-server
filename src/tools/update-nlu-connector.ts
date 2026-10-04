/**
 * update_nlu_connector tool
 * Updates an existing NLU connector.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  nluConnectorId: z
    .string()
    .describe("The NLU connector ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the NLU connector"),
  settings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Type-specific settings to update"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateNluConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_nlu_connector",
    "Updates an existing Cognigy.AI NLU connector. Use this to change name or update type-specific settings. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { nluConnectorId, name, settings, dryRun } = inputSchema.parse(args);

      // Verify the connector exists
      const existing = await client.readNLUConnector({ nluConnectorId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the NLU connector.",
                  existingConnector: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                    hasSettings: !!settings,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (settings !== undefined) updates.settings = settings;

      // The update endpoint returns no body, so report what was sent
      await client.updateNLUConnector({
        nluConnectorId,
        ...updates,
      } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                nluConnectorId,
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
