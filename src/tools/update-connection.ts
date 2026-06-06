/**
 * update_connection tool
 * Updates an existing connection.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  connectionId: z
    .string()
    .describe("The connection ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the connection"),
  fields: z
    .record(z.string())
    .optional()
    .describe("Connection field values to update as key-value pairs"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateConnection(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_connection",
    "Updates an existing Cognigy.AI connection. Use this to change connection name or update credential values. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { connectionId, name, fields, dryRun } = inputSchema.parse(args);

      // Verify the connection exists
      const existing = await client.readConnection({ connectionId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the connection.",
                  existingConnection: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                    fieldCount: fields ? Object.keys(fields).length : 0,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Update the connection
      const result = await client.updateConnection({
        connectionId,
        name,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                connection: {
                  _id: result._id,
                  name: result.name,
                },
                note: "Connection updated. Secret values are stored securely and not returned.",
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
