/**
 * upload_snapshot_package tool
 * Uploads a snapshot package file to a project.
 * This is an async operation that polls the task until completion.
 *
 * Note: This tool accepts a file path and reads the file from disk.
 * The MCP server runs locally, so it has access to local files.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The target project ID to upload the snapshot package to"),
  filePath: z
    .string()
    .describe("Local file path to the snapshot package file (e.g., './snapshot.csnap' or 'C:/snapshots/backup.csnap')"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(180000)
    .describe("Maximum time to wait for upload and processing (5-600 seconds, default 180)"),
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
    .describe("If true (default), validates the file exists without uploading. Set to false to actually upload."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerUploadSnapshotPackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "upload_snapshot_package",
    "Uploads a snapshot package file to a Cognigy.AI project. Use this to restore a previously downloaded snapshot or transfer a snapshot between environments. MUTATING: Set dryRun=false to upload. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        projectId,
        filePath,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: true,
                  message: `File not found: ${filePath}`,
                  suggestion: "Please provide a valid path to a snapshot package file.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
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
                  message: "Validation passed. File exists. Set dryRun=false to upload the snapshot package.",
                  wouldUpload: {
                    projectId,
                    filePath,
                    timeoutMs,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Read the file
      const fileBuffer = await readFile(filePath);

      // Start the upload task
      const taskResponse = await client.uploadSnapshotPackage({
        projectId,
        file: fileBuffer,
      });

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
                  uploaded: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Upload did not complete within ${timeoutMs}ms. Task may still be running.`,
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
                  uploaded: false,
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
                  uploaded: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Snapshot upload was cancelled.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Success - the snapshot ID may be available in task parameters
      const taskData = task as { parameters?: { snapshotId?: string; resourceId?: string } } | null;
      const snapshotId = taskData?.parameters?.snapshotId ?? taskData?.parameters?.resourceId ?? null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                uploaded: true,
                status: "done",
                taskId,
                snapshotId,
                projectId,
                filePath,
                elapsedMs,
                nextStep: snapshotId
                  ? "Snapshot uploaded. Use restore_snapshot to apply it to the project."
                  : "Snapshot uploaded. Check list_snapshots to find the new snapshot.",
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
