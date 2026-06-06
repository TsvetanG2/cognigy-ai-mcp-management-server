/**
 * list_connections tool
 * Lists all connections in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter connections by project ID. Omit for all accessible connections."),
  resourceLevel: z
    .enum(["organisation", "project"])
    .optional()
    .describe("Scope: 'organisation' for global connections, 'project' for project-specific"),
  filter: z
    .string()
    .optional()
    .describe("Filter connections by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of connections to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListConnections(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_connections",
    "Lists Cognigy.AI connections (external service integrations like databases, APIs, etc.). Connections store credentials securely. Use this to find available connections for a project or organization.",
    inputSchema.shape,
    async (args) => {
      const { projectId, resourceLevel, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexConnections({
        projectId,
        resourceLevel,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const connections = (result.items || []).map((conn) => ({
        _id: conn._id,
        referenceId: conn.referenceId,
        name: conn.name,
        type: conn.type,
        createdAt: typeof conn.createdAt === "number"
          ? new Date(conn.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof conn.lastChanged === "number"
          ? new Date(conn.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                connections,
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
