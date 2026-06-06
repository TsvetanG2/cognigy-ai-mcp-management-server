/**
 * promote_snapshot tool
 * Promotes a snapshot by packaging it for download, making it ready for transfer.
 * This is a composite tool that combines snapshot packaging with download link generation.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  snapshotId: z
    .string()
    .describe("The snapshot ID to promote"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(180000)
    .describe("Maximum time to wait for packaging (5-600 seconds, default 180)"),
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
    .describe("If true (default), validates without packaging. Set to false to actually package and generate download link."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerPromoteSnapshot(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "promote_snapshot",
    "Promotes a Cognigy.AI snapshot for deployment by packaging it and generating a download link. Use this to prepare a snapshot for transfer to another environment. MUTATING: Set dryRun=false to package. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        snapshotId,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Fetch snapshot details
      let snapshotInfo: { name?: string; createdAt?: number } = {};
      try {
        const snapshot = await client.readSnapshot({ snapshotId });
        snapshotInfo = {
          name: snapshot.name,
          createdAt: snapshot.createdAt,
        };
      } catch {
        // Snapshot might not exist
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
                  message: "Validation passed. Set dryRun=false to package the snapshot and generate download link.",
                  wouldPromote: {
                    snapshotId,
                    name: snapshotInfo.name ?? "(unknown)",
                    createdAt: snapshotInfo.createdAt
                      ? new Date(snapshotInfo.createdAt).toISOString()
                      : "(unknown)",
                  },
                  steps: [
                    "1. Package the snapshot",
                    "2. Generate download link",
                    "3. Download the package file",
                    "4. Upload to target environment using upload_snapshot_package",
                    "5. Restore using restore_snapshot",
                  ],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Step 1: Package the snapshot
      const taskResponse = await client.packageSnapshot({ snapshotId });
      const taskId = taskResponse._id;
      const startTime = Date.now();

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

      const packagingElapsedMs = Date.now() - startTime;

      if (lastStatus !== "done") {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  promoted: false,
                  step: "packaging",
                  status: lastStatus === "error" ? "error" : lastStatus === "cancelled" ? "cancelled" : "timeout",
                  taskId,
                  failReason: task?.failReason ?? "Packaging did not complete successfully",
                  elapsedMs: packagingElapsedMs,
                },
                null,
                2
              ),
            },
          ],
          isError: lastStatus === "error",
        };
      }

      // Step 2: Generate download link
      let downloadLink: string | null = null;
      try {
        const linkResult = await client.composeSnapshotDownloadLink({ snapshotId });
        downloadLink = linkResult.downloadLink;
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  promoted: false,
                  step: "download_link",
                  status: "error",
                  message: "Snapshot was packaged but failed to generate download link",
                  taskId,
                  packagingElapsedMs,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const totalElapsedMs = Date.now() - startTime;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                promoted: true,
                status: "done",
                snapshotId,
                name: snapshotInfo.name ?? "(unknown)",
                downloadLink,
                taskId,
                elapsedMs: totalElapsedMs,
                nextSteps: [
                  "1. Download the package file from the downloadLink",
                  "2. In the target environment, use upload_snapshot_package with the downloaded file",
                  "3. Use restore_snapshot to apply the uploaded snapshot",
                ],
                note: "Download link is temporary and will expire. Download promptly.",
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
