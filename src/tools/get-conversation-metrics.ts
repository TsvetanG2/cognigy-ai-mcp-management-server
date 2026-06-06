/**
 * get_conversation_metrics tool
 * Gets conversation counter metrics for a project or organization.
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
  startDate: z
    .string()
    .optional()
    .describe("Start date for metrics (ISO 8601 format)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for metrics (ISO 8601 format)"),
  timezone: z
    .string()
    .optional()
    .describe("Timezone for aggregation (e.g., 'UTC', 'America/New_York')"),
});

export function registerGetConversationMetrics(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_conversation_metrics",
    "Gets Cognigy.AI conversation counter metrics. Returns aggregated conversation counts for a project or entire organization over a time period.",
    inputSchema.shape,
    async (args) => {
      const { projectId, startDate, endDate, timezone } = inputSchema.parse(args);

      let result: Record<string, unknown>;

      if (projectId) {
        // Project-level metrics
        result = await (client as any).getConversationCounter({
          projectId,
          startDate,
          endDate,
          timezone,
        }) as Record<string, unknown>;
      } else {
        // Organization-wide metrics
        result = await (client as any).getConversationCounterOrganisation({
          startDate,
          endDate,
          timezone,
        }) as Record<string, unknown>;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                scope: projectId ? "project" : "organization",
                projectId: projectId || undefined,
                metrics: result,
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
