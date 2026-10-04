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
    "Gets detailed information about a specific Cognigy.AI handover service (accepts the service ID or name). Returns its version, service URL, and properties.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { serviceId } = inputSchema.parse(args);

      // The API has no single-service read, so look it up in the index
      const services = await client.indexHandoverServices({ limit: 100 } as Parameters<typeof client.indexHandoverServices>[0]);
      const service = (services.items || []).find((s) => s._id === serviceId || s.name === serviceId);
      if (!service) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Handover service '${serviceId}' not found.`,
                availableServices: (services.items || []).map((s) => ({ _id: s._id, name: s.name })),
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: service._id,
                referenceId: service.referenceId,
                name: service.name,
                version: service.version,
                serviceUrl: service.serviceUrl,
                properties: service.properties,
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
