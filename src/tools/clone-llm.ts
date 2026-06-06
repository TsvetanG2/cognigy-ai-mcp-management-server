/**
 * clone_llm tool
 * Clones an existing large language model configuration.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  largeLanguageModelId: z
    .string()
    .describe("The LLM ID to clone"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without cloning. Set to false to actually clone."),
});

export function registerCloneLlm(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "clone_llm",
    "Clones a Cognigy.AI large language model configuration. Creates a copy with the same settings that can be modified independently. MUTATING: Set dryRun=false to clone.",
    inputSchema.shape,
    async (args) => {
      const { largeLanguageModelId, dryRun } = inputSchema.parse(args);

      // Verify the source LLM exists
      const source = await client.readLargeLanguageModel({ largeLanguageModelId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to clone the LLM.",
                  wouldClone: {
                    sourceId: source._id,
                    sourceName: source.name,
                    provider: source.provider,
                    modelType: source.modelType,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.cloneLargeLanguageModel({ largeLanguageModelId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                cloned: true,
                source: {
                  _id: source._id,
                  name: source.name,
                },
                newLlm: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  provider: result.provider,
                  modelType: result.modelType,
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
