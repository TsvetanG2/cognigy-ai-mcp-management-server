/**
 * delete_snapshot tool
 * Deletes a snapshot from a Cognigy.AI project.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to delete"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(300000)
    .default(60000)
    .describe("Maximum time to wait for deletion (5-300 seconds, default 60)"),
  pollIntervalMs: z
    .number()
    .int()
    .min(1000)
    .max(10000)
    .default(2000)
    .describe("How often to check task status (1-10 seconds, default 2)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete. WARNING: This is irreversible!"),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerDeleteSnapshot(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_snapshot",
    "Deletes a snapshot from a Cognigy.AI project. DESTRUCTIVE & IRREVERSIBLE: The snapshot and all its data will be permanently removed. Use dryRun=true (default) to validate first. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        snapshotId,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Fetch snapshot details for confirmation
      let snapshotInfo: { name?: string } = {};
      try {
        const snapshot = await client.readSnapshot({ snapshotId });
        snapshotInfo = {
          name: snapshot.name,
        };
      } catch {
        // Snapshot might not exist or be inaccessible
      }

      // In dry run mode, validate and return what would happen
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to DELETE the snapshot. WARNING: This is irreversible!",
                  wouldDelete: {
                    snapshotId,
                    name: snapshotInfo.name ?? "(unknown)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the deletion task
      const taskResponse = await client.deleteSnapshot({ snapshotId });

      const taskId = taskResponse._id;
      const startTime = Date.now();

      // Poll until completion or timeout
      let lastStatus = taskResponse.status;
      let task: Awaited<ReturnType<typeof client.readTask>> | null = null;

      while (Date.now() - startTime < timeoutMs) {
        if (TERMINAL_STATES.has(lastStatus)) {
          break;
        }

        await sleep(pollIntervalMs);

        try {
          task = await client.readTask({ taskId });
          lastStatus = task.status;

          if (TERMINAL_STATES.has(lastStatus)) {
            break;
          }
        } catch (error) {
          await sleep(1000);
          try {
            task = await client.readTask({ taskId });
            lastStatus = task.status;
          } catch {
            lastStatus = "done";
            break;
          }
        }
      }

      const elapsedMs = Date.now() - startTime;
      const timedOut = !TERMINAL_STATES.has(lastStatus) && elapsedMs >= timeoutMs;

      if (timedOut) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  deleted: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Deletion did not complete within ${timeoutMs}ms. Task may still be running.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (lastStatus === "error") {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  deleted: false,
                  status: "error",
                  taskId,
                  failReason: task?.failReason ?? "Unknown error",
                  elapsedMs,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      if (lastStatus === "cancelled") {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  deleted: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Snapshot deletion was cancelled.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Success
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                status: "done",
                taskId,
                snapshotId,
                name: snapshotInfo.name ?? "(unknown)",
                elapsedMs,
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
