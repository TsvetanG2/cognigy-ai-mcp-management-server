/**
 * get_intent tool
 * Gets detailed information about a specific intent.
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
    .describe("The intent ID to retrieve"),
  localeId: z
    .string()
    .optional()
    .describe("Optional locale ID for localized content"),
});

export function registerGetIntent(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_intent",
    "Gets detailed configuration of a specific intent in a Cognigy.AI flow. Returns the intent's conditions, rules, confirmation sentences, and settings. Use this to inspect NLU behavior before modifying.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId, intentId, localeId } = inputSchema.parse(args);

      const intent = await client.readIntent({
        flowId,
        intentId,
        preferredLocaleId: localeId,
      });

      const result = {
        id: intent._id,
        referenceId: intent.referenceId,
        name: intent.name,
        description: intent.description,
        condition: intent.condition,
        rules: intent.rules,
        tags: intent.tags,
        isRejectIntent: intent.isRejectIntent,
        isDisabled: intent.isDisabled,
        confirmationSentences: intent.confirmationSentences,
        disambiguationSentence: intent.disambiguationSentence,
        parentIntentId: intent.parentIntentId,
        nodeReferenceId: intent.nodeReferenceId,
        createdAt: intent.createdAt,
        lastChanged: intent.lastChanged,
        data: intent.data,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
