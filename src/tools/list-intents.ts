/**
 * list_intents tool
 * Lists all intents in a flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to list intents from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of intents to return (1-100, default 25)"),
  includeChildren: z
    .boolean()
    .default(false)
    .describe("Include child intents in the results"),
  localeId: z
    .string()
    .optional()
    .describe("Optional locale ID for localized content"),
});

export function registerListIntents(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_intents",
    "Lists all intents in a Cognigy.AI flow. Intents are the NLU triggers that match user utterances to flow logic. Use this to explore NLU configuration before training or modifying intents.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId, limit, includeChildren, localeId } = inputSchema.parse(args);

      const result = await client.indexIntents({
        flowId,
        limit,
        includeChildren,
        preferredLocaleId: localeId,
      });

      const intents = result.items.map((intent) => ({
        id: intent._id,
        referenceId: intent.referenceId,
        name: intent.name,
        description: intent.description,
        tags: intent.tags,
        isRejectIntent: intent.isRejectIntent,
        isDisabled: intent.isDisabled,
        parentIntentId: intent.parentIntentId || undefined,
        localeReference: intent.localeReference,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                flowId,
                total: result.total,
                returned: intents.length,
                nextCursor: result.nextCursor,
                intents,
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
