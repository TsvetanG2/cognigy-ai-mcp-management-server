/**
 * get_snapshot tool
 * Gets detailed information about a specific snapshot.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to retrieve"),
});

export function registerGetSnapshot(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_snapshot",
    "Gets detailed information about a specific Cognigy.AI snapshot. Returns name, description, hash, and packaging status. Use this to inspect a version before deployment.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { snapshotId } = inputSchema.parse(args);

      const snapshot = await client.readSnapshot({ snapshotId });

      const result = {
        id: snapshot._id,
        name: snapshot.name,
        description: snapshot.description,
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
