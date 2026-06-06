/**
 * create_sentence tool
 * Creates a new example sentence for an intent.
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
    .describe("The intent ID to add the sentence to"),
  localeId: z
    .string()
    .describe("The locale ID for this sentence"),
  text: z
    .string()
    .describe("The example sentence text"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateSentence(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_sentence",
    "Creates a new example sentence for NLU intent training. MUTATING: This modifies the intent's training data. Use dryRun=true (default) to validate first. After creating, call train_intents to retrain.",
    inputSchema.shape,
    async (args) => {
      const { flowId, intentId, localeId, text, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the sentence. Remember to call train_intents afterward.",
                  wouldCreate: {
                    flowId,
                    intentId,
                    localeId,
                    text,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createSentence({
        flowId,
        intentId,
        localeId,
        text,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                sentence: {
                  id: result._id,
                  text: result.text,
                  slotCount: result.slots?.length ?? 0,
                },
                nextStep: "Call train_intents to retrain the NLU model.",
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
