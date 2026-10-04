/**
 * delete_handover_provider tool
 * Deletes a handover provider.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID the handover provider belongs to"),
  providerId: z
    .string()
    .describe("The handover provider ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteHandoverProvider(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_handover_provider",
    "Deletes a Cognigy.AI handover provider. WARNING: Endpoints using this provider will no longer be able to escalate to live agents. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { projectId, providerId, dryRun } = inputSchema.parse(args);

      // Verify the provider exists
      const existing = await client.readHandoverProvider({ handoverProviderId: providerId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the handover provider.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    serviceId: existing.serviceId,
                  },
                  warning: "Deleting this provider will break handover for any endpoints using it.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteHandoverProvider({ handoverProviderId: providerId, projectId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                providerId,
                note: "Handover provider has been deleted.",
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
