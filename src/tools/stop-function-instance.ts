/**
 * stop_function_instance tool
 * Stops a running function instance.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  functionId: z
    .string()
    .describe("The function ID"),
  functionInstanceId: z
    .string()
    .describe("The function instance ID to stop"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without stopping. Set to false to actually stop."),
});

export function registerStopFunctionInstance(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "stop_function_instance",
    "Stops a running Cognigy.AI Function instance. Use this to cancel a long-running or stuck function. MUTATING: Set dryRun=false to stop.",
    inputSchema.shape,
    async (args) => {
      const { functionId, functionInstanceId, dryRun } = inputSchema.parse(args);

      // Verify the instance exists
      const instance = await client.readFunctionInstance({ functionId, functionInstanceId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to stop the instance.",
                  wouldStop: {
                    functionInstanceId,
                    status: instance.status,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.stopFunctionInstance({ functionId, functionInstanceId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                stopped: true,
                functionInstanceId,
                note: "Function instance stop signal sent.",
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
