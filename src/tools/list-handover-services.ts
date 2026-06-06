/**
 * list_handover_services tool
 * Lists available handover services.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of services to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListHandoverServices(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_handover_services",
    "Lists available Cognigy.AI handover services. Handover services are the supported integrations for live agent escalation.",
    inputSchema.shape,
    async (args) => {
      const { limit, skip } = inputSchema.parse(args);

      const result = await client.indexHandoverServices({
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number };

      const services = (result.items || []).map((service) => ({
        _id: service._id,
        name: service.name,
        type: service.type,
        description: service.description,
        configSchema: service.configSchema,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                services,
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
