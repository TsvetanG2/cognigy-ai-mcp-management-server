/**
 * get_function_instance tool
 * Gets detailed information about a function instance.
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
    .describe("The function instance ID to retrieve"),
});

export function registerGetFunctionInstance(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_function_instance",
    "Gets detailed information about a specific Cognigy.AI Function instance. Returns execution status, timing, input parameters, and output/error.",
    inputSchema.shape,
    async (args) => {
      const { functionId, functionInstanceId } = inputSchema.parse(args);

      const instance = await client.readFunctionInstance({ functionId, functionInstanceId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: instance._id,
                functionId,
                status: instance.status,
                error: instance.error,
                createdAt: typeof instance.createdAt === "number"
                  ? new Date(instance.createdAt * 1000).toISOString()
                  : undefined,
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
