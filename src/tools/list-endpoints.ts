/**
 * list_endpoints tool
 * Lists all endpoints in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to list endpoints from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of endpoints to return (1-100, default 25)"),
});

export function registerListEndpoints(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "list_endpoints",
    "Lists all endpoints in a Cognigy.AI project. Endpoints are channel connectors (Webchat, REST, Voice, etc.) that expose flows/agents to users. Use this to discover deployed channels.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      if (!projectId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "projectId is required",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = await client.indexEndpoints({
        projectId,
        limit: parsed.limit,
      });

      const endpoints = result.items.map((ep) => ({
        id: ep._id,
        name: ep.name,
        channel: ep.channel,
        URLToken: ep.URLToken,
        flowId: ep.flowId || undefined,
        agentId: ep.agentId || undefined,
        targetType: ep.targetType,
        localeId: ep.localeId,
        createdAt: ep.createdAt,
        lastChanged: ep.lastChanged,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                total: result.total,
                returned: endpoints.length,
                nextCursor: result.nextCursor,
                endpoints,
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
