/**
 * create_knowledge_connector tool
 * Creates a new knowledge connector for automated content ingestion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to create the connector in"),
  name: z
    .string()
    .describe("Name for the connector"),
  type: z
    .string()
    .describe("Connector type (e.g., 'sharepoint', 'confluence', 'custom')"),
  connectionId: z
    .string()
    .optional()
    .describe("Connection ID for authentication"),
  settings: z
    .record(z.unknown())
    .optional()
    .describe("Type-specific connector settings"),
  schedule: z
    .string()
    .optional()
    .describe("Cron expression for scheduled runs"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateKnowledgeConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_knowledge_connector",
    "Creates a new Cognigy.AI knowledge connector for automated content ingestion from external sources like SharePoint or Confluence. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, name, type, connectionId, settings, schedule, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the knowledge connector.",
                  wouldCreate: {
                    knowledgeStoreId,
                    name,
                    type,
                    hasConnection: !!connectionId,
                    hasSchedule: !!schedule,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createKnowledgeConnector({
        knowledgeStoreId,
        name,
        type,
        connectionId,
        ...settings,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                connector: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
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
