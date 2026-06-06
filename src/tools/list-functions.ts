/**
 * list_functions tool
 * Lists all functions in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter functions by project ID"),
  filter: z
    .string()
    .optional()
    .describe("Filter functions by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of functions to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListFunctions(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_functions",
    "Lists Cognigy.AI Functions. Functions are custom code modules that can be triggered to run computations, integrations, or scheduled jobs outside of flow execution.",
    inputSchema.shape,
    async (args) => {
      const { projectId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexFunctions({
        projectId,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const functions = (result.items || []).map((fn) => ({
        _id: fn._id,
        referenceId: fn.referenceId,
        name: fn.name,
        createdAt: typeof fn.createdAt === "number"
          ? new Date(fn.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof fn.lastChanged === "number"
          ? new Date(fn.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                functions,
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
