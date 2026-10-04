/**
 * update_handover_provider tool
 * Updates an existing handover provider.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

type ProviderProperty = { key: string; value: unknown };

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID the handover provider belongs to"),
  providerId: z
    .string()
    .describe("The handover provider ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the provider"),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Provider properties to set, as key/value pairs (see get_handover_provider for the current keys). Keys not listed are kept."),
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
    "Updates an existing Cognigy.AI handover provider. Use this to rename it or change its properties. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { projectId, providerId, name, properties, dryRun } = inputSchema.parse(args);

      // Verify the provider exists
      const existing = await client.readHandoverProvider({ handoverProviderId: providerId }) as unknown as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (properties !== undefined) {
        // The API replaces the whole list, so merge the given keys into the current properties
        const merged = new Map(((existing.properties as ProviderProperty[] | undefined) ?? []).map((p) => [p.key, p.value]));
        for (const [key, value] of Object.entries(properties)) merged.set(key, value);
        updates.properties = [...merged].map(([key, value]) => ({ key, value }));
      }

      if (Object.keys(updates).length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No updates specified. Provide name or properties.",
              }),
            },
          ],
          isError: true,
        };
      }

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
                    serviceId: existing.serviceId,
                  },
                  wouldUpdate: updates,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateHandoverProvider({
        handoverProviderId: providerId,
        projectId,
        ...updates,
      } as Parameters<typeof client.updateHandoverProvider>[0]) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                provider: {
                  _id: providerId,
                  name: result.name,
                  properties: result.properties,
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
