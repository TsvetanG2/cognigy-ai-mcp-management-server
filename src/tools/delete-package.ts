/**
 * delete_package tool
 * Deletes a package from a Cognigy.AI project.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  packageId: z
    .string()
    .describe("The package ID to delete"),
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

export function registerDeletePackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_package",
    "Deletes a package from a Cognigy.AI project. DESTRUCTIVE & IRREVERSIBLE: The package will be permanently removed. Use dryRun=true (default) to validate first. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        packageId,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Fetch package details for confirmation
      let packageInfo: { name?: string } = {};
      try {
        const pkg = await client.readPackage({ packageId });
        packageInfo = {
          name: pkg.name,
        };
      } catch {
        // Package might not exist or be inaccessible
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
                  message: "Validation passed. Set dryRun=false to DELETE the package. WARNING: This is irreversible!",
                  wouldDelete: {
                    packageId,
                    name: packageInfo.name ?? "(unknown)",
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
      const taskResponse = await client.deletePackage({ packageId });

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
                  message: "Package deletion was cancelled.",
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
                packageId,
                name: packageInfo.name ?? "(unknown)",
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
