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
  description: z
    .string()
    .optional()
    .describe("New description"),
  code: z
    .string()
    .optional()
    .describe("Updated function code"),
  parameters: z
    .record(z.unknown())
    .optional()
    .describe("Updated parameters schema"),
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
    "Updates an existing Cognigy.AI Function. Use this to change code, name, or parameters. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { functionId, name, code, parameters, dryRun } = inputSchema.parse(args);

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
                    name: name || "(unchanged)",
                    hasNewCode: !!code,
                    hasNewParameters: !!parameters,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateFunction({
        functionId,
        name,
        code,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                function: {
                  _id: result._id,
                  name: result.name,
                },
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
