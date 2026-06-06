/**
 * list_function_instances tool
 * Lists running instances of a function.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  functionId: z
    .string()
    .describe("The function ID to list instances for"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of instances to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListFunctionInstances(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_function_instances",
    "Lists running and completed instances of a Cognigy.AI Function. Shows execution history, status, and results.",
    inputSchema.shape,
    async (args) => {
      const { functionId, limit, skip } = inputSchema.parse(args);

      const result = await client.indexFunctionInstances({
        functionId,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const instances = (result.items || []).map((instance) => ({
        _id: instance._id,
        status: instance.status,
        error: instance.error,
        createdAt: typeof instance.createdAt === "number"
          ? new Date(instance.createdAt * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                instances,
                total: result.total,
                pagination: {
                  limit,
                  skip,
                  nextCursor: result.nextCursor,
                  previousCursor: result.previousCursor,
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
