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
  extension: z
    .string()
    .describe("Name of the extension that provides the knowledge connector (see list_extensions)"),
  type: z
    .string()
    .describe("Connector type as defined by the extension"),
  version: z
    .string()
    .describe("Version of the extension's connector to use"),
  config: z
    .record(z.string(), z.unknown())
    .default({})
    .describe("Connector-specific configuration, including any connection reference the connector requires"),
  schedule: z
    .object({
      enabled: z.boolean().describe("Whether scheduled runs are enabled"),
      weekDays: z.array(z.number().int().min(0).max(6)).describe("Days to run on (0 = Sunday ... 6 = Saturday)"),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    })
    .default({ enabled: false, weekDays: [], hour: 0, minute: 0 })
    .describe("Run schedule. Defaults to disabled (run manually with run_knowledge_connector)."),
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
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args) => {
      const { knowledgeStoreId, name, extension, type, version, config, schedule, dryRun } = inputSchema.parse(args);

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
                    extension,
                    type,
                    version,
                    configKeys: Object.keys(config),
                    schedule,
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
        extension,
        type,
        version,
        config,
        schedule,
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
