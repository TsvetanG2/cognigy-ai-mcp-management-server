/**
 * upload_package tool
 * Uploads a package file to a project.
 * This is an async operation that polls the task until completion.
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
    .describe("The target project ID to upload the package to"),
  filePath: z
    .string()
    .describe("Local file path to the package file"),
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

export function registerUploadPackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "upload_package",
    "Uploads a package file to a Cognigy.AI project. Use this to import a previously downloaded package or transfer resources between environments. MUTATING: Set dryRun=false to upload. Async operation.",
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
                  suggestion: "Please provide a valid path to a package file.",
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
                  message: "Validation passed. File exists. Set dryRun=false to upload the package.",
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
      const taskResponse = await client.uploadPackage({
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
                  message: "Package upload was cancelled.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Success
      const taskData = task as { parameters?: { packageId?: string; resourceId?: string } } | null;
      const packageId = taskData?.parameters?.packageId ?? taskData?.parameters?.resourceId ?? null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                uploaded: true,
                status: "done",
                taskId,
                packageId,
                projectId,
                filePath,
                elapsedMs,
                nextStep: packageId
                  ? "Package uploaded. Use merge_package to import its resources."
                  : "Package uploaded. Use list_packages to find it, then merge_package to import.",
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
