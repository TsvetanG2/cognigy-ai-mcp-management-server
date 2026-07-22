/**
 * list_snapshots tool
 * Lists all snapshots in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to list snapshots from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of snapshots to return (1-100, default 25)"),
});

export function registerListSnapshots(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  server.tool(
    "list_snapshots",
    "Lists all snapshots in a Cognigy.AI project. Snapshots are versioned backups of project configuration used for deployment and rollback. Use this to see available versions.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const parsed = inputSchema.parse(args);
      const projectId = parsed.projectId || config.defaultProjectId;

      if (!projectId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "projectId is required",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = await client.indexSnapshots({
        projectId,
        limit: parsed.limit,
      });

      const snapshots = result.items.map((snap) => ({
        id: snap._id,
        name: snap.name,
        description: snap.description,
        hash: snap.hash,
        isPackaged: snap.isPackaged,
        packageExpiresAt: snap.packageExpiresAt,
        createdAt: snap.createdAt,
        createdBy: snap.createdBy,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                projectId,
                total: result.total,
                returned: snapshots.length,
                nextCursor: result.nextCursor,
                snapshots,
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
