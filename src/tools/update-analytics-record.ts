/**
 * update_analytics_record tool
 * Updates analytics records for a session.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID"),
  sessionId: z
    .string()
    .describe("The session ID to update analytics for"),
  properties: z
    .record(z.unknown())
    .describe("Custom analytics properties to set"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateAnalyticsRecord(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_analytics_record",
    "Updates Cognigy.AI analytics records for a session. Use this to add custom tracking properties to conversation analytics. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { projectId, sessionId, properties, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the analytics record.",
                  wouldUpdate: {
                    projectId,
                    sessionId,
                    propertyCount: Object.keys(properties).length,
                    propertyNames: Object.keys(properties),
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.updateAnalyticsRecords({
        projectId,
        sessionId,
        properties,
      } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                sessionId,
                note: "Analytics record has been updated with custom properties.",
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
