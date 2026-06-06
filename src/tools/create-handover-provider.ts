/**
 * create_handover_provider tool
 * Creates a new handover provider.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the handover provider in"),
  name: z
    .string()
    .describe("Name for the handover provider"),
  type: z
    .string()
    .describe("Provider type (e.g., 'salesforce', 'genesys', 'ringcentral', 'custom')"),
  settings: z
    .record(z.unknown())
    .optional()
    .describe("Provider-specific configuration settings"),
  enabled: z
    .boolean()
    .default(true)
    .describe("Whether the provider is enabled"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateHandoverProvider(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_handover_provider",
    "Creates a new Cognigy.AI handover provider for live agent escalation. Configure providers like Salesforce, Genesys, or RingCentral. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, name, type, settings, enabled, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the handover provider.",
                  wouldCreate: {
                    projectId,
                    name,
                    type,
                    enabled,
                    hasSettings: !!settings,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createHandoverProvider({
        projectId,
        name,
        type,
        settings,
        enabled,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                provider: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  type: result.type,
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
