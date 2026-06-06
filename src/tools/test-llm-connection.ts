/**
 * test_llm_connection tool
 * Tests the connection to an LLM provider.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  largeLanguageModelId: z
    .string()
    .describe("The LLM ID to test"),
});

export function registerTestLlmConnection(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "test_llm_connection",
    "Tests the connection to a Cognigy.AI large language model provider. Validates that the credentials are correct and the provider is reachable. Use this to verify LLM setup before using it in flows.",
    inputSchema.shape,
    async (args) => {
      const { largeLanguageModelId } = inputSchema.parse(args);

      // Get LLM details for context
      const llm = await client.readLargeLanguageModel({ largeLanguageModelId });

      try {
        const result = await client.testLargeLanguageModel({ largeLanguageModelId });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  llm: {
                    _id: llm._id,
                    name: llm.name,
                    provider: llm.provider,
                    modelType: llm.modelType,
                  },
                  testResult: result,
                  message: "Connection test successful. The LLM is configured correctly.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  llm: {
                    _id: llm._id,
                    name: llm.name,
                    provider: llm.provider,
                    modelType: llm.modelType,
                  },
                  error: errorMessage,
                  message: "Connection test failed. Check credentials and provider settings.",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );
}
