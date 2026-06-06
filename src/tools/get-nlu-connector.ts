/**
 * get_nlu_connector tool
 * Gets detailed information about a specific NLU connector.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  nluConnectorId: z
    .string()
    .describe("The NLU connector ID to retrieve"),
});

export function registerGetNluConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_nlu_connector",
    "Gets detailed configuration of a specific Cognigy.AI NLU connector. Returns type, settings, and connection details for external NLU service integration.",
    inputSchema.shape,
    async (args) => {
      const { nluConnectorId } = inputSchema.parse(args);

      const connector = await client.readNLUConnector({ nluConnectorId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: connector._id,
                referenceId: connector.referenceId,
                name: connector.name,
                type: connector.type,
                // Include type-specific settings but redact any secrets
                settings: connector.settings,
                createdAt: connector.createdAt
                  ? new Date(connector.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: connector.lastChanged
                  ? new Date(connector.lastChanged * 1000).toISOString()
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
