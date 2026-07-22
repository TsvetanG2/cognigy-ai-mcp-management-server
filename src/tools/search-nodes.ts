/**
 * search_nodes tool
 * Searches for nodes in a flow by text content.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to search within"),
  query: z
    .string()
    .min(1)
    .describe("The search text to find in node content"),
  localeId: z
    .string()
    .describe("The locale ID to search in"),
});

export function registerSearchNodes(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "search_nodes",
    "Searches for nodes in a Cognigy.AI flow by text content. Finds nodes containing the search term in their configuration (messages, conditions, code, etc.). Use this to locate specific content within large flows.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId, query, localeId } = inputSchema.parse(args);

      const result = await client.searchChartNodes({
        resourceId: flowId,
        resourceType: "flow",
        filter: query,
        preferredLocaleId: localeId,
      });

      const matches = result.items.map((item) => ({
        nodeId: item.nodeId,
        nodeReferenceId: item.nodeReferenceId,
        matches: item.matches.map((match) => ({
          fieldType: match.fieldType,
          path: match.matchPath,
        })),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                flowId,
                query,
                localeId,
                total: result.total,
                matches,
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
