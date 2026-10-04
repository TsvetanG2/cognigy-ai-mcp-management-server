/**
 * update_function tool
 * Updates an existing function.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  functionId: z
    .string()
    .describe("The function ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the function"),
  code: z
    .string()
    .optional()
    .describe("Updated function code"),
  isDisabled: z
    .boolean()
    .optional()
    .describe("Disable (true) or enable (false) the function"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateFunction(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_function",
    "Updates an existing Cognigy.AI Function. Use this to change its name or code, or to enable/disable it. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { functionId, name, code, isDisabled, dryRun } = inputSchema.parse(args);

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (code !== undefined) updates.code = code;
      if (isDisabled !== undefined) updates.isDisabled = isDisabled;

      if (Object.keys(updates).length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No updates specified. Provide name, code, or isDisabled.",
              }),
            },
          ],
          isError: true,
        };
      }

      // Verify the function exists
      const existing = await client.readFunction({ functionId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the function.",
                  existingFunction: {
                    _id: existing._id,
                    name: existing.name,
                  },
                  wouldUpdate: {
                    fields: Object.keys(updates),
                    name: name ?? "(unchanged)",
                    hasNewCode: code !== undefined,
                    isDisabled: isDisabled ?? "(unchanged)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // The update endpoint returns no body, so report what was sent
      await client.updateFunction({
        functionId,
        ...updates,
      } as Parameters<typeof client.updateFunction>[0]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                functionId,
                fieldsUpdated: Object.keys(updates),
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
