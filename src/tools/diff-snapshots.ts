/**
 * diff_snapshots tool
 * Compares two snapshots and shows the differences.
 * This is a composite tool that fetches resources from both snapshots.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

// Supported resource types for snapshot indexing
const SUPPORTED_RESOURCE_TYPES = ["flow", "nluconnector", "locale", "largeLanguageModel"] as const;
type SupportedResourceType = typeof SUPPORTED_RESOURCE_TYPES[number];

const inputSchema = z.object({
  snapshotIdA: z
    .string()
    .describe("The 'before' snapshot ID (base for comparison)"),
  snapshotIdB: z
    .string()
    .describe("The 'after' snapshot ID (what changed)"),
  resourceTypes: z
    .array(z.enum(SUPPORTED_RESOURCE_TYPES))
    .optional()
    .describe("Types of resources to compare. Supported: flow, nluconnector, locale, largeLanguageModel (default: all)"),
});

interface ResourceSummary {
  _id: string;
  name: string;
  referenceId?: string;
}

export function registerDiffSnapshots(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "diff_snapshots",
    "Compares two Cognigy.AI snapshots and shows what changed (added, removed, modified resources). Useful for reviewing changes before deployment or understanding what a snapshot update will affect.",
    inputSchema.shape,
    async (args) => {
      const { snapshotIdA, snapshotIdB, resourceTypes } = inputSchema.parse(args);

      // Get snapshot metadata
      const [snapshotA, snapshotB] = await Promise.all([
        client.readSnapshot({ snapshotId: snapshotIdA }),
        client.readSnapshot({ snapshotId: snapshotIdB }),
      ]);

      // Define resource types to compare
      const typesToCompare: SupportedResourceType[] = resourceTypes || [...SUPPORTED_RESOURCE_TYPES];

      // Collect resources from both snapshots
      const resourcesA: Record<string, ResourceSummary[]> = {};
      const resourcesB: Record<string, ResourceSummary[]> = {};

      for (const resourceType of typesToCompare) {
        try {
          const [resultA, resultB] = await Promise.all([
            client.indexResourcesInSnapshot({ snapshotId: snapshotIdA, resourceType, limit: 100 }),
            client.indexResourcesInSnapshot({ snapshotId: snapshotIdB, resourceType, limit: 100 }),
          ]);

          resourcesA[resourceType] = resultA.items.map((item) => ({
            _id: item._id,
            name: item.name,
            referenceId: item.referenceId,
          }));

          resourcesB[resourceType] = resultB.items.map((item) => ({
            _id: item._id,
            name: item.name,
            referenceId: item.referenceId,
          }));
        } catch {
          // Type might not be supported or snapshots might not have resources of this type
          resourcesA[resourceType] = [];
          resourcesB[resourceType] = [];
        }
      }

      // Calculate differences
      const diff: {
        resourceType: string;
        added: ResourceSummary[];
        removed: ResourceSummary[];
        unchanged: number;
      }[] = [];

      for (const resourceType of typesToCompare) {
        const itemsA = resourcesA[resourceType] || [];
        const itemsB = resourcesB[resourceType] || [];

        // Create lookup maps by referenceId (preferred) or _id
        const mapA = new Map(itemsA.map((item) => [item.referenceId || item._id, item]));
        const mapB = new Map(itemsB.map((item) => [item.referenceId || item._id, item]));

        const added: ResourceSummary[] = [];
        const removed: ResourceSummary[] = [];
        let unchanged = 0;

        // Find items in B that are not in A (added)
        for (const [key, item] of mapB) {
          if (!mapA.has(key)) {
            added.push(item);
          } else {
            unchanged++;
          }
        }

        // Find items in A that are not in B (removed)
        for (const [key, item] of mapA) {
          if (!mapB.has(key)) {
            removed.push(item);
          }
        }

        if (added.length > 0 || removed.length > 0 || unchanged > 0) {
          diff.push({
            resourceType,
            added,
            removed,
            unchanged,
          });
        }
      }

      // Summary statistics
      const totalAdded = diff.reduce((sum, d) => sum + d.added.length, 0);
      const totalRemoved = diff.reduce((sum, d) => sum + d.removed.length, 0);
      const totalUnchanged = diff.reduce((sum, d) => sum + d.unchanged, 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                comparison: {
                  snapshotA: {
                    _id: snapshotIdA,
                    name: snapshotA.name,
                    createdAt: snapshotA.createdAt
                      ? new Date(snapshotA.createdAt).toISOString()
                      : undefined,
                  },
                  snapshotB: {
                    _id: snapshotIdB,
                    name: snapshotB.name,
                    createdAt: snapshotB.createdAt
                      ? new Date(snapshotB.createdAt).toISOString()
                      : undefined,
                  },
                },
                summary: {
                  totalAdded,
                  totalRemoved,
                  totalUnchanged,
                },
                differences: diff.filter((d) => d.added.length > 0 || d.removed.length > 0),
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
