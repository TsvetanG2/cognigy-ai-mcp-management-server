/**
 * list_nlu_connectors tool
 * Lists all NLU connectors in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter NLU connectors by project ID"),
  filter: z
    .string()
    .optional()
    .describe("Filter NLU connectors by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of NLU connectors to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListNluConnectors(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_nlu_connectors",
    "Lists Cognigy.AI NLU connectors. NLU connectors enable integration with external NLU services like Dialogflow, LUIS, Watson, or custom solutions for intent recognition.",
    inputSchema.shape,
    async (args) => {
      const { projectId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexNLUConnectors({
        projectId,
        filter,
        limit,
        skip,
      });

      const connectors = (result.items || []).map((connector) => ({
        _id: connector._id,
        referenceId: connector.referenceId,
        name: connector.name,
        type: connector.type,
        createdAt: connector.createdAt
          ? new Date(connector.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: connector.lastChanged
          ? new Date(connector.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                connectors,
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
