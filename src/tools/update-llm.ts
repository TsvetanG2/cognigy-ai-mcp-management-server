/**
 * update_llm tool
 * Updates an existing large language model configuration.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  largeLanguageModelId: z
    .string()
    .describe("The LLM ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the LLM"),
  description: z
    .string()
    .optional()
    .describe("New description"),
  isDefault: z
    .boolean()
    .optional()
    .describe("Set as the default LLM"),
  connectionId: z
    .string()
    .optional()
    .describe("New connection ID for credentials"),
  providerConfig: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Provider-specific configuration updates"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateLlm(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_llm",
    "Updates an existing Cognigy.AI large language model configuration. Use this to change name, description, credentials, or provider settings. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { largeLanguageModelId, name, description, isDefault, connectionId, providerConfig, dryRun } = inputSchema.parse(args);

      // Verify the LLM exists
      const existing = await client.readLargeLanguageModel({ largeLanguageModelId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the LLM.",
                  existingLlm: {
                    _id: existing._id,
                    name: existing.name,
                    provider: existing.provider,
                    modelType: existing.modelType,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                    description: description !== undefined ? description : "(unchanged)",
                    isDefault: isDefault !== undefined ? isDefault : "(unchanged)",
                    connectionId: connectionId || "(unchanged)",
                    hasProviderConfig: !!providerConfig,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Build update params
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (isDefault !== undefined) updates.isDefault = isDefault;
      if (connectionId !== undefined) updates.connectionId = connectionId;

      // Add provider-specific settings
      if (providerConfig && existing.provider) {
        updates[existing.provider as string] = providerConfig;
      }

      // The update endpoint returns no body, so report what was sent
      await client.updateLargeLanguageModel({ largeLanguageModelId, ...updates } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                largeLanguageModelId,
                provider: existing.provider,
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
