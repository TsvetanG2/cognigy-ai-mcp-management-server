/**
 * get_connection tool
 * Gets detailed information about a specific connection.
 * IMPORTANT: Secret values are redacted for security.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  connectionId: z
    .string()
    .describe("The connection ID to retrieve"),
});

export function registerGetConnection(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_connection",
    "Gets detailed information about a specific Cognigy.AI connection. Returns connection metadata and schema. NOTE: Secret values are REDACTED for security - this tool only shows field names, not actual credentials.",
    inputSchema.shape,
    async (args) => {
      const { connectionId } = inputSchema.parse(args);

      const connection = await client.readConnection({ connectionId }) as unknown as Record<string, unknown>;

      // SECURITY: Redact secret values - only show field names, not values
      const result = {
        _id: connection._id,
        name: connection.name,
        type: connection.type,
        // REDACTED: Never expose connection secret values
        fields: connection.fields ? "[REDACTED]" : undefined,
        createdAt: typeof connection.createdAt === "number"
          ? new Date(connection.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof connection.lastChanged === "number"
          ? new Date(connection.lastChanged * 1000).toISOString()
          : undefined,
        createdBy: connection.createdBy,
        lastChangedBy: connection.lastChangedBy,
        _securityNote: "Secret values are redacted. Use this connection by referenceId in your flows.",
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
