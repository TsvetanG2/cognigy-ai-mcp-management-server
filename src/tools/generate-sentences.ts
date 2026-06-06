/**
 * generate_sentences tool
 * Uses AI to generate example sentences for an intent.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID containing the intent"),
  intentId: z
    .string()
    .describe("The intent ID to generate sentences for"),
  localeId: z
    .string()
    .optional()
    .describe("Optional locale ID for locale-specific generation"),
  limit: z
    .number()
    .int()
    .min(5)
    .max(20)
    .default(5)
    .describe("Number of sentences to generate (5-20, default 5)"),
});

export function registerGenerateSentences(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "generate_sentences",
    "Uses Cognigy AI to generate example sentences for an intent. The generated sentences are NOT automatically added - use create_sentence to add them. Useful for quickly expanding NLU training data.",
    inputSchema.shape,
    async (args) => {
      const { flowId, intentId, localeId, limit } = inputSchema.parse(args);

      const params: {
        flowId: string;
        intentId: string;
        limit?: number;
        localeId?: string;
      } = {
        flowId,
        intentId,
        limit,
      };

      if (localeId) {
        params.localeId = localeId;
      }

      const result = await client.generateSentences(params);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                intentId,
                generatedCount: result.sentences?.length ?? 0,
                sentences: result.sentences ?? [],
                nextStep: "Review the sentences and use create_sentence to add good ones to the intent.",
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
