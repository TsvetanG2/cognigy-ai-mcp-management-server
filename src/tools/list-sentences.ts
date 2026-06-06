/**
 * list_sentences tool
 * Lists example sentences for an intent.
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
    .describe("The intent ID to list sentences for"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of sentences to return (1-100, default 25)"),
});

export function registerListSentences(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_sentences",
    "Lists example sentences (training data) for an NLU intent. Use this to review training data quality before training.",
    inputSchema.shape,
    async (args) => {
      const { flowId, intentId, limit } = inputSchema.parse(args);

      const result = await client.indexSentences({
        flowId,
        intentId,
        limit,
      });

      const sentences = result.items.map((s) => ({
        id: s._id,
        text: s.text,
        slotCount: s.slots?.length ?? 0,
        createdAt: s.createdAt,
        lastChanged: s.lastChanged,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                intentId,
                total: result.total,
                returned: sentences.length,
                sentences,
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
