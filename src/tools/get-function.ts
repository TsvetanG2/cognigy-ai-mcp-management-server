/**
 * get_function tool
 * Gets detailed information about a specific function.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  functionId: z
    .string()
    .describe("The function ID to retrieve"),
});

export function registerGetFunction(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_function",
    "Gets detailed configuration of a specific Cognigy.AI Function. Returns the function code, settings, and runtime configuration.",
    inputSchema.shape,
    async (args) => {
      const { functionId } = inputSchema.parse(args);

      const fn = await client.readFunction({ functionId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: fn._id,
                referenceId: fn.referenceId,
                name: fn.name,
                code: fn.code,
                createdAt: typeof fn.createdAt === "number"
                  ? new Date(fn.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof fn.lastChanged === "number"
                  ? new Date(fn.lastChanged * 1000).toISOString()
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
