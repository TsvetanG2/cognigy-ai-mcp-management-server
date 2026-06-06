/**
 * create_intent tool
 * Creates a new intent in a Cognigy.AI flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID where the intent will be created"),
  name: z
    .string()
    .describe("Intent name (unique within the flow)"),
  description: z
    .string()
    .optional()
    .describe("Human-readable description of what this intent recognizes"),
  exampleSentences: z
    .array(z.string())
    .optional()
    .describe("Initial training sentences for the intent"),
  condition: z
    .string()
    .optional()
    .describe("CognigyScript condition for additional matching constraints"),
  isDisabled: z
    .boolean()
    .default(false)
    .describe("Whether the intent is disabled (won't match)"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags for organizing intents"),
  confirmationSentences: z
    .array(z.string())
    .optional()
    .describe("Sentences used for intent confirmation"),
  rules: z
    .array(z.string())
    .optional()
    .describe("Additional rule patterns for matching"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateIntent(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_intent",
    "Creates a new intent in a Cognigy.AI flow for NLU recognition. MUTATING: This modifies the flow. Use dryRun=true (default) to validate first. After creating, use train_intents to train the NLU model.",
    inputSchema.shape,
    async (args) => {
      const {
        flowId,
        name,
        description,
        exampleSentences,
        condition,
        isDisabled,
        tags,
        confirmationSentences,
        rules,
        dryRun,
      } = inputSchema.parse(args);

      // In dry run mode, validate and return what would be created
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the intent. Remember to call train_intents afterward.",
                  wouldCreate: {
                    flowId,
                    name,
                    description,
                    exampleSentenceCount: exampleSentences?.length ?? 0,
                    condition: condition ?? "(no condition)",
                    isDisabled,
                    tags: tags ?? [],
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Build create params
      const createParams: Record<string, unknown> = {
        flowId,
        name,
      };

      if (description !== undefined) createParams.description = description;
      if (condition !== undefined) createParams.condition = condition;
      if (isDisabled !== undefined) createParams.isDisabled = isDisabled;
      if (tags !== undefined) createParams.tags = tags;
      if (confirmationSentences !== undefined) createParams.confirmationSentences = confirmationSentences;
      if (rules !== undefined) createParams.rules = rules;

      // Note: exampleSentences may need to be added via a separate API call
      // depending on the Cognigy API version. The create endpoint may accept
      // them directly or they may need to be added via createExampleSentence.
      if (exampleSentences !== undefined) {
        createParams.data = { exampleSentences };
      }

      const result = await client.createIntent(
        createParams as unknown as Parameters<typeof client.createIntent>[0]
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                intent: {
                  id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  description: result.description,
                  isDisabled: result.isDisabled,
                },
                nextStep: "Call train_intents to train the NLU model with the new intent.",
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
