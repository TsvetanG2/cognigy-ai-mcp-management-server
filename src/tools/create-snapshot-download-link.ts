/**
 * create_snapshot_download_link tool
 * Creates a temporary download link for a snapshot.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to create a download link for"),
});

export function registerCreateSnapshotDownloadLink(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_snapshot_download_link",
    "Creates a temporary download link for a Cognigy.AI snapshot. The link can be used to download the snapshot as a file for backup or transfer to another environment. Links are time-limited.",
    inputSchema.shape,
    async (args) => {
      const { snapshotId } = inputSchema.parse(args);

      // Get snapshot info for context
      let snapshotInfo: { name?: string } = {};
      try {
        const snapshot = await client.readSnapshot({ snapshotId });
        snapshotInfo = {
          name: snapshot.name,
        };
      } catch {
        // Continue even if we can't get snapshot info
      }

      const result = await client.composeSnapshotDownloadLink({ snapshotId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                snapshotId,
                name: snapshotInfo.name ?? "(unknown)",
                downloadLink: result.downloadLink,
                note: "This link is temporary and will expire. Download promptly.",
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
