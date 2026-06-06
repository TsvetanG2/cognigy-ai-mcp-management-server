/**
 * delete_nlu_connector tool
 * Deletes an NLU connector.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  nluConnectorId: z
    .string()
    .describe("The NLU connector ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteNluConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_nlu_connector",
    "Deletes a Cognigy.AI NLU connector. WARNING: Endpoints using this connector will lose NLU functionality. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { nluConnectorId, dryRun } = inputSchema.parse(args);

      // Verify the connector exists
      const existing = await client.readNLUConnector({ nluConnectorId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the NLU connector.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                  },
                  warning: "Deleting an NLU connector will affect endpoints using it for intent recognition.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteNLUConnector({ nluConnectorId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                nluConnectorId,
                note: "NLU connector has been permanently deleted.",
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
