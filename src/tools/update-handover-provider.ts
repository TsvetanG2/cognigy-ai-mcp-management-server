/**
 * update_handover_provider tool
 * Updates an existing handover provider.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  providerId: z
    .string()
    .describe("The handover provider ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the provider"),
  settings: z
    .record(z.unknown())
    .optional()
    .describe("Updated provider settings"),
  enabled: z
    .boolean()
    .optional()
    .describe("Enable or disable the provider"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateHandoverProvider(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_handover_provider",
    "Updates an existing Cognigy.AI handover provider. Use this to change settings or enable/disable the provider. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { providerId, name, settings, enabled, dryRun } = inputSchema.parse(args);

      // Verify the provider exists
      const existing = await client.readHandoverProvider({ providerId } as any) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the handover provider.",
                  existingProvider: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                    enabled: existing.enabled,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                    enabled: enabled !== undefined ? enabled : "(unchanged)",
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

      const result = await client.updateHandoverProvider({
        providerId,
        name,
        settings,
        enabled,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                provider: {
                  _id: result._id,
                  name: result.name,
                  enabled: result.enabled,
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
