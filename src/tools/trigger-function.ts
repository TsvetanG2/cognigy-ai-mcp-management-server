/**
 * trigger_function tool
 * Triggers a function to run.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  functionId: z
    .string()
    .describe("The function ID to trigger"),
  input: z
    .record(z.unknown())
    .optional()
    .describe("Input parameters for the function"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without triggering. Set to false to actually trigger."),
});

export function registerTriggerFunction(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "trigger_function",
    "Triggers a Cognigy.AI Function to run immediately. Creates a new function instance that executes the function code. MUTATING: Set dryRun=false to trigger.",
    inputSchema.shape,
    async (args) => {
      const { functionId, input, dryRun } = inputSchema.parse(args);

      // Verify the function exists
      const fn = await client.readFunction({ functionId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to trigger the function.",
                  wouldTrigger: {
                    _id: fn._id,
                    name: fn.name,
                    hasInput: !!input,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.triggerFunction({
        functionId,
        parameters: input || {},
      }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                triggered: true,
                function: {
                  _id: fn._id,
                  name: fn.name,
                },
                instance: {
                  _id: result._id,
                  status: result.status,
                },
                note: "Function triggered. Use get_function_instance to check status.",
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
