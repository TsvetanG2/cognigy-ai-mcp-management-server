/**
 * delete_connection tool
 * Deletes a connection.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  connectionId: z
    .string()
    .describe("The connection ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteConnection(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_connection",
    "Deletes a Cognigy.AI connection. WARNING: This is destructive and cannot be undone. Flows using this connection will break. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { connectionId, dryRun } = inputSchema.parse(args);

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
                  message: "Validation passed. Set dryRun=false to delete the connection.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                  },
                  warning: "Deleting a connection is permanent. Any flows using this connection will fail.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Delete the connection
      await client.deleteConnection({ connectionId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                connectionId,
                note: "Connection has been permanently deleted.",
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
