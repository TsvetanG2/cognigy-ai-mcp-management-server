/**
 * list_projects tool
 * Lists all projects accessible by the API key.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of projects to return (1-100, default 25)"),
});

export function registerListProjects(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_projects",
    "Lists all Cognigy.AI projects accessible by your API key. Use this to discover available projects before working with flows, intents, or other resources.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { limit } = inputSchema.parse(args);

      const result = await client.indexProjects({
        limit,
      });

      const projects = result.items.map((project) => ({
        id: project._id,
        name: project.name,
        color: project.color,
        createdAt: project.createdAt,
        lastChanged: project.lastChanged,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                total: result.total,
                returned: projects.length,
                projects,
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
