/**
 * get_handover_provider tool
 * Gets details of a specific handover provider.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  providerId: z
    .string()
    .describe("The handover provider ID to retrieve"),
});

export function registerGetHandoverProvider(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_handover_provider",
    "Gets detailed information about a specific Cognigy.AI handover provider. Returns provider type, configuration, and connection settings.",
    inputSchema.shape,
    async (args) => {
      const { providerId } = inputSchema.parse(args);

      const provider = await client.readHandoverProvider({ providerId } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: provider._id,
                referenceId: provider.referenceId,
                name: provider.name,
                type: provider.type,
                enabled: provider.enabled,
                settings: provider.settings,
                createdAt: typeof provider.createdAt === "number"
                  ? new Date(provider.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof provider.lastChanged === "number"
                  ? new Date(provider.lastChanged * 1000).toISOString()
                  : undefined,
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
