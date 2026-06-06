/**
 * delete_extension tool
 * Deletes an extension.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  extensionId: z
    .string()
    .describe("The extension ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteExtension(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_extension",
    "Deletes a Cognigy.AI Extension. WARNING: Flows using nodes from this extension will break. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { extensionId, dryRun } = inputSchema.parse(args);

      // Verify the extension exists
      const existing = await client.readExtension({ extensionId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the extension.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    version: existing.version,
                  },
                  warning: "Deleting an extension will break flows using its nodes.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteExtension({ extensionId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                extensionId,
                note: "Extension has been permanently deleted.",
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
