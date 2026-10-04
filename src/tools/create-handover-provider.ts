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
    .describe("Handover service name as returned by list_handover_services (e.g., 'liveAgent', 'salesforce', 'genesysCloud', 'chatwoot')"),
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
    "Creates a new Cognigy.AI handover provider for live agent escalation, based on one of the services from list_handover_services. The provider starts with the service's default properties; change them with update_handover_provider. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (args) => {
      const { projectId, name, type, dryRun } = inputSchema.parse(args);

      // The API needs the service's ID, so resolve it from the service name
      const services = await client.indexHandoverServices({ projectId, limit: 100 } as Parameters<typeof client.indexHandoverServices>[0]);
      const service = (services.items || []).find((s) => s.name === type);
      if (!service) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Unknown handover service '${type}'.`,
                availableServices: (services.items || []).map((s) => s.name),
              }),
            },
          ],
          isError: true,
        };
      }

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
                    service: service.name,
                    serviceId: service._id,
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
        serviceId: service._id,
      } as Parameters<typeof client.createHandoverProvider>[0]) as unknown as Record<string, unknown>;

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
                  service: service.name,
                  properties: result.properties,
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
