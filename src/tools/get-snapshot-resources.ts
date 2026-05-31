/**
 * get_snapshot_resources tool
 * Lists resources contained in a snapshot.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to list resources from"),
  resourceType: z
    .enum(["flow", "nluconnector", "locale", "flowState", "largeLanguageModel"])
    .describe("Type of resources to list"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of resources to return (1-100, default 25)"),
});

export function registerGetSnapshotResources(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_snapshot_resources",
    "Lists resources (flows, locales, NLU connectors, LLMs) contained in a Cognigy.AI snapshot. Use this to inspect what a snapshot contains before restoring or to compare versions.",
    inputSchema.shape,
    async (args) => {
      const { snapshotId, resourceType, limit } = inputSchema.parse(args);

      const result = await client.indexResourcesInSnapshot({
        snapshotId,
        resourceType,
        limit,
      });

      const resources = result.items.map((res) => ({
        id: res._id,
        referenceId: res.referenceId,
        name: res.name,
        resourceType: res.resourceType,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                snapshotId,
                resourceType,
                total: result.total,
                returned: resources.length,
                nextCursor: result.nextCursor,
                resources,
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
