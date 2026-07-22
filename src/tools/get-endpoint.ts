/**
 * get_endpoint tool
 * Gets detailed information about a specific endpoint.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  endpointId: z
    .string()
    .describe("The endpoint ID to retrieve"),
});

export function registerGetEndpoint(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_endpoint",
    "Gets detailed configuration of a specific Cognigy.AI endpoint. Returns channel settings, flow/agent binding, and runtime configuration. Use this to inspect endpoint behavior.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { endpointId } = inputSchema.parse(args);

      const endpoint = await client.readEndpoint({ endpointId });

      const result = {
        id: endpoint._id,
        name: endpoint.name,
        channel: endpoint.channel,
        URLToken: endpoint.URLToken,
        flowId: endpoint.flowId || undefined,
        agentId: endpoint.agentId || undefined,
        targetType: endpoint.targetType,
        localeId: endpoint.localeId,
        entrypoint: endpoint.entrypoint,
        active: endpoint.active,
        nluConnectorId: endpoint.nluConnectorId || undefined,
        useConversations: endpoint.useConversations,
        createdAt: endpoint.createdAt,
        lastChanged: endpoint.lastChanged,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
