/**
 * get_handover_service tool
 * Gets details of a specific handover service.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  serviceId: z
    .string()
    .describe("The handover service ID to retrieve"),
});

export function registerGetHandoverService(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_handover_service",
    "Gets detailed information about a specific Cognigy.AI handover service. Returns service type, configuration schema, and supported features.",
    inputSchema.shape,
    async (args) => {
      const { serviceId } = inputSchema.parse(args);

      const service = await (client as any).readHandoverService({ serviceId }) as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: service._id,
                name: service.name,
                type: service.type,
                description: service.description,
                configSchema: service.configSchema,
                features: service.features,
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
