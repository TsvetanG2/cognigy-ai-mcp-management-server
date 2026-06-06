/**
 * delete_llm tool
 * Deletes a large language model configuration.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  largeLanguageModelId: z
    .string()
    .describe("The LLM ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteLlm(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_llm",
    "Deletes a Cognigy.AI large language model configuration. WARNING: Features using this LLM will stop working. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { largeLanguageModelId, dryRun } = inputSchema.parse(args);

      // Verify the LLM exists
      const existing = await client.readLargeLanguageModel({ largeLanguageModelId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the LLM.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    provider: existing.provider,
                    modelType: existing.modelType,
                  },
                  warning: "Deleting an LLM will break features that depend on it (Knowledge AI, AI Agents, etc.).",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteLargeLanguageModel({ largeLanguageModelId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                largeLanguageModelId,
                note: "LLM configuration has been permanently deleted.",
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
