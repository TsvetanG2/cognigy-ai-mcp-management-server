/**
 * list_extensions tool
 * Lists all extensions in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter extensions by project ID"),
  filter: z
    .string()
    .optional()
    .describe("Filter extensions by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of extensions to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListExtensions(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_extensions",
    "Lists Cognigy.AI Extensions. Extensions are custom node packages that add new capabilities to flows (e.g., integrations, custom actions).",
    inputSchema.shape,
    async (args) => {
      const { projectId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexExtensions({
        projectId,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const extensions = (result.items || []).map((ext) => ({
        _id: ext._id,
        referenceId: ext.referenceId,
        name: ext.name,
        description: ext.description,
        version: ext.version,
        trustedCode: ext.trustedCode,
        createdAt: typeof ext.createdAt === "number"
          ? new Date(ext.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof ext.lastChanged === "number"
          ? new Date(ext.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                extensions,
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
