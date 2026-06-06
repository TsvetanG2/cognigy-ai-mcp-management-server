/**
 * restore_snapshot tool
 * Restores a snapshot to its project, replacing current configuration.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to restore"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(180000)
    .describe("Maximum time to wait for restore (5-600 seconds, default 180)"),
  pollIntervalMs: z
    .number()
    .int()
    .min(1000)
    .max(10000)
    .default(3000)
    .describe("How often to check task status (1-10 seconds, default 3)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without restoring. Set to false to actually restore. WARNING: This replaces the current project configuration!"),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerRestoreSnapshot(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "restore_snapshot",
    "Restores a snapshot to its Cognigy.AI project, replacing the current configuration. DESTRUCTIVE: Current project state will be overwritten with the snapshot's state. Use dryRun=true (default) to validate first. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        snapshotId,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Fetch snapshot details for confirmation
      let snapshotInfo: { name?: string; createdAt?: number } = {};
      try {
        const snapshot = await client.readSnapshot({ snapshotId });
        snapshotInfo = {
          name: snapshot.name,
          createdAt: snapshot.createdAt,
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
                  message: "Validation passed. Set dryRun=false to RESTORE the snapshot. WARNING: This will replace the current project configuration!",
                  wouldRestore: {
                    snapshotId,
                    name: snapshotInfo.name ?? "(unknown)",
                    createdAt: snapshotInfo.createdAt
                      ? new Date(snapshotInfo.createdAt).toISOString()
                      : "(unknown)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the restore task
      const taskResponse = await client.restoreSnapshot({ snapshotId });

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
                  restored: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Restore did not complete within ${timeoutMs}ms. Task may still be running. Use get_task to check status.`,
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
                  restored: false,
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
                  restored: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Snapshot restore was cancelled.",
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
                restored: true,
                status: "done",
                taskId,
                snapshotId,
                name: snapshotInfo.name ?? "(unknown)",
                elapsedMs,
                message: "Project configuration has been restored from the snapshot.",
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
