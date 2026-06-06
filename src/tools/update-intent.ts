/**
 * update_intent tool
 * Updates an existing intent in a Cognigy.AI flow.
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
    .describe("The ID of the intent to update"),
  localeId: z
    .string()
    .optional()
    .describe("Locale ID for locale-specific updates"),
  name: z
    .string()
    .optional()
    .describe("New intent name"),
  description: z
    .string()
    .optional()
    .describe("New description"),
  condition: z
    .string()
    .optional()
    .describe("New CognigyScript condition"),
  isDisabled: z
    .boolean()
    .optional()
    .describe("Whether the intent is disabled"),
  tags: z
    .array(z.string())
    .optional()
    .describe("New tags array (replaces existing)"),
  confirmationSentences: z
    .array(z.string())
    .optional()
    .describe("New confirmation sentences (replaces existing)"),
  disambiguationSentence: z
    .string()
    .optional()
    .describe("Sentence shown when disambiguating between intents"),
  rules: z
    .array(z.string())
    .optional()
    .describe("New rule patterns (replaces existing)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateIntent(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_intent",
    "Updates an existing intent in a Cognigy.AI flow. MUTATING: This modifies the intent. Use dryRun=true (default) to validate first. After updating, call train_intents to retrain the NLU model.",
    inputSchema.shape,
    async (args) => {
      const {
        flowId,
        intentId,
        localeId,
        name,
        description,
        condition,
        isDisabled,
        tags,
        confirmationSentences,
        disambiguationSentence,
        rules,
        dryRun,
      } = inputSchema.parse(args);

      // Build the update payload with only provided fields
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (condition !== undefined) updates.condition = condition;
      if (isDisabled !== undefined) updates.isDisabled = isDisabled;
      if (tags !== undefined) updates.tags = tags;
      if (confirmationSentences !== undefined) updates.confirmationSentences = confirmationSentences;
      if (disambiguationSentence !== undefined) updates.disambiguationSentence = disambiguationSentence;
      if (rules !== undefined) updates.rules = rules;
      if (localeId !== undefined) updates.localeId = localeId;

      const updateCount = Object.keys(updates).length;
      if (updateCount === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No updates specified. Provide at least one field to update.",
              }),
            },
          ],
          isError: true,
        };
      }

      // In dry run mode, show what would be updated
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to apply the update. Remember to call train_intents afterward if training-relevant fields changed.",
                  wouldUpdate: {
                    intentId,
                    fieldsToUpdate: Object.keys(updates),
                    updates,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Actually update the intent
      await client.updateIntent({
        flowId,
        intentId,
        ...updates,
      } as unknown as Parameters<typeof client.updateIntent>[0]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                intentId,
                fieldsUpdated: Object.keys(updates),
                nextStep: "If you changed training-relevant fields, call train_intents to retrain.",
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
