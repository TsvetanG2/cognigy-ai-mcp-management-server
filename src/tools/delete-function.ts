/**
 * delete_function tool
 * Deletes a function.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  functionId: z
    .string()
    .describe("The function ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteFunction(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_function",
    "Deletes a Cognigy.AI Function. WARNING: This is destructive. Flows calling this function will fail. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { functionId, dryRun } = inputSchema.parse(args);

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
                  message: "Validation passed. Set dryRun=false to delete the function.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                  },
                  warning: "Deleting a function will cause flows calling it to fail.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteFunction({ functionId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                functionId,
                note: "Function has been permanently deleted.",
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
