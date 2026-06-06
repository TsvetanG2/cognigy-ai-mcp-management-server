/**
 * search_resources tool
 * Searches across all resources in the organization.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  query: z
    .string()
    .describe("Search query string"),
  resourceTypes: z
    .array(z.enum([
      "endpoint",
      "extension",
      "flow",
      "function",
      "lexicon",
      "goal",
      "handoverProvider",
      "nluconnector",
      "playbook",
      "project",
      "snapshot",
    ]))
    .optional()
    .describe("Filter by resource types (defaults to all types)"),
  projectId: z
    .string()
    .optional()
    .describe("Filter results to a specific project"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of results to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerSearchResources(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "search_resources",
    "Searches across all Cognigy.AI resources in the organization. Finds flows, intents, endpoints, functions, playbooks, and more by name or content. Powerful for discovering resources across projects.",
    inputSchema.shape,
    async (args) => {
      const { query, resourceTypes, projectId, limit, skip } = inputSchema.parse(args);

      const result = await client.searchResources({
        query,
        resourceTypes,
        projectId,
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number };

      const resources = (result.items || []).map((resource) => ({
        _id: resource._id,
        referenceId: resource.referenceId,
        name: resource.name,
        type: resource.type,
        projectId: resource.projectId,
        projectName: resource.projectName,
        matchedField: resource.matchedField,
        matchedValue: resource.matchedValue,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query,
                results: resources,
                total: result.total,
                pagination: {
                  limit,
                  skip,
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
