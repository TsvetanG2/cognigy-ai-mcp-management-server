/**
 * get_llm tool
 * Gets detailed information about a specific LLM.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  largeLanguageModelId: z
    .string()
    .describe("The LLM ID to retrieve"),
});

export function registerGetLlm(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_llm",
    "Gets detailed configuration of a specific Cognigy.AI large language model. Returns provider settings, model type, connection details, and fallback configuration.",
    inputSchema.shape,
    async (args) => {
      const { largeLanguageModelId } = inputSchema.parse(args);

      const llm = await client.readLargeLanguageModel({ largeLanguageModelId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: llm._id,
                referenceId: llm.referenceId,
                name: llm.name,
                description: llm.description,
                provider: llm.provider,
                modelType: llm.modelType,
                modelGroup: llm.modelGroup,
                apiType: llm.apiType,
                isDefault: llm.isDefault,
                isCustomModel: llm.isCustomModel,
                resourceLevel: llm.resourceLevel,
                connectionId: llm.connectionId,
                // Provider-specific settings
                openAI: llm.openAI,
                anthropic: llm.anthropic,
                azureOpenAI: llm.azureOpenAI,
                googleVertexAI: llm.googleVertexAI,
                googleGemini: llm.googleGemini,
                googleGenAI: llm.googleGenAI,
                alephAlpha: llm.alephAlpha,
                openAICompatible: llm.openAICompatible,
                // Fallback configuration
                fallbacks: llm.fallbacks,
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
