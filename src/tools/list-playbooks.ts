/**
 * list_playbooks tool
 * Lists all playbooks in a Cognigy.AI project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to list playbooks from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of playbooks to return (1-100, default 25)"),
});

export function registerListPlaybooks(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_playbooks",
    "Lists all playbooks in a Cognigy.AI project. Playbooks are automated test scenarios with steps and assertions for testing conversational flows.",
    inputSchema.shape,
    async (args) => {
      const { projectId, limit } = inputSchema.parse(args);

      const result = await client.indexPlaybooks({
        projectId,
        limit,
      });

      const playbooks = result.items.map((p) => ({
        id: p._id,
        name: p.name,
        createdAt: p.createdAt,
        lastChanged: p.lastChanged,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                total: result.total,
                returned: playbooks.length,
                playbooks,
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
