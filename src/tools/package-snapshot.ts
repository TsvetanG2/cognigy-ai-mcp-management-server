/**
 * package_snapshot tool
 * Packages a snapshot for download/transfer.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to package"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(120000)
    .describe("Maximum time to wait for packaging (5-600 seconds, default 120)"),
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
    .describe("If true (default), validates without packaging. Set to false to actually package."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerPackageSnapshot(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "package_snapshot",
    "Packages a Cognigy.AI snapshot for download or transfer. Creates a downloadable package from the snapshot. Use create_snapshot_download_link after packaging to get the download URL. MUTATING: Set dryRun=false to package. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        snapshotId,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Fetch snapshot details for context
      let snapshotInfo: { name?: string } = {};
      try {
        const snapshot = await client.readSnapshot({ snapshotId });
        snapshotInfo = {
          name: snapshot.name,
        };
      } catch {
        // Continue even if we can't get snapshot info
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
                  message: "Validation passed. Set dryRun=false to package the snapshot.",
                  wouldPackage: {
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

      // Start the packaging task
      const taskResponse = await client.packageSnapshot({ snapshotId });

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
                  packaged: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Packaging did not complete within ${timeoutMs}ms. Task may still be running.`,
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
                  packaged: false,
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
                  packaged: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Snapshot packaging was cancelled.",
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
                packaged: true,
                status: "done",
                taskId,
                snapshotId,
                name: snapshotInfo.name ?? "(unknown)",
                elapsedMs,
                nextStep: "Use create_snapshot_download_link to get the download URL.",
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
