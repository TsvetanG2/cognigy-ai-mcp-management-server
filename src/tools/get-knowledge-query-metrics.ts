/**
 * get_knowledge_query_metrics tool
 * Gets Knowledge AI query counter metrics for a project or organization.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Project ID for project-level metrics. Omit for organization-wide metrics."),
  year: z
    .number()
    .int()
    .optional()
    .describe("Year to report on (e.g., 2026). Defaults to the current year."),
  month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe("Month to report on (1-12). Defaults to the current month."),
});

export function registerGetKnowledgeQueryMetrics(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_knowledge_query_metrics",
    "Gets Cognigy.AI Knowledge AI query counter metrics for one month. Returns aggregated knowledge query counts for a project or the entire organization.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const now = new Date();
      const { projectId, year = now.getUTCFullYear(), month = now.getUTCMonth() + 1 } = inputSchema.parse(args);

      const result = projectId
        ? await client.getKnowledgeQueryCounter({ projectId, year, month })
        : await client.getKnowledgeQueryCounterOrganisation({ year, month });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                scope: projectId ? "project" : "organization",
                projectId: projectId || undefined,
                year,
                month,
                metrics: result.items,
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
