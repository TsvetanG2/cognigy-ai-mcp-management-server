/**
 * list_handover_providers tool
 * Lists handover providers in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter handover providers by project ID"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of providers to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListHandoverProviders(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_handover_providers",
    "Lists Cognigy.AI handover providers. Handover providers enable live agent escalation (e.g., Salesforce, Genesys, RingCentral).",
    inputSchema.shape,
    async (args) => {
      const { projectId, limit, skip } = inputSchema.parse(args);

      const result = await client.indexHandoverProviders({
        projectId,
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number };

      const providers = (result.items || []).map((provider) => ({
        _id: provider._id,
        referenceId: provider.referenceId,
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled,
        createdAt: typeof provider.createdAt === "number"
          ? new Date(provider.createdAt * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                providers,
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
