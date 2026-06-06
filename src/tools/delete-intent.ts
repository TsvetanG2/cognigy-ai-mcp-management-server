/**
 * delete_intent tool
 * Deletes an intent from a Cognigy.AI flow.
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
    .describe("The ID of the intent to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete. WARNING: Deletion cannot be undone."),
});

export function registerDeleteIntent(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_intent",
    "Deletes an intent from a Cognigy.AI flow. MUTATING & DESTRUCTIVE: This permanently removes the intent and its example sentences. Use dryRun=true (default) to validate first. After deleting, call train_intents to retrain.",
    inputSchema.shape,
    async (args) => {
      const { flowId, intentId, dryRun } = inputSchema.parse(args);

      // In dry run mode, verify the intent exists and show what would be deleted
      if (dryRun) {
        // Fetch the intent to verify it exists and show its details
        const intent = await client.readIntent({ flowId, intentId });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Intent found. Set dryRun=false to delete it. WARNING: This cannot be undone. Remember to call train_intents afterward.",
                  wouldDelete: {
                    intentId,
                    name: intent.name,
                    description: intent.description,
                    isDisabled: intent.isDisabled,
                    tags: intent.tags,
                    isRejectIntent: intent.isRejectIntent,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Actually delete the intent
      await client.deleteIntent({ flowId, intentId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                intentId,
                nextStep: "Call train_intents to retrain the NLU model without this intent.",
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
