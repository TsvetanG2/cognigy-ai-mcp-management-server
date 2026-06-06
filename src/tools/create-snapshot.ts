/**
 * create_snapshot tool
 * Creates a new snapshot of a Cognigy.AI project.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create a snapshot of"),
  name: z
    .string()
    .describe("Name for the snapshot (e.g., 'v1.0.0', 'pre-release-backup')"),
  description: z
    .string()
    .default("")
    .describe("Optional description of what this snapshot contains or why it was created"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(120000)
    .describe("Maximum time to wait for snapshot creation (5-600 seconds, default 120)"),
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
    .describe("If true (default), validates without creating. Set to false to actually create the snapshot."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerCreateSnapshot(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_snapshot",
    "Creates a snapshot of a Cognigy.AI project. Snapshots capture the entire project configuration (flows, intents, endpoints, etc.) for backup or deployment. MUTATING: Set dryRun=false to create. Async operation - polls until complete.",
    inputSchema.shape,
    async (args) => {
      const {
        projectId,
        name,
        description,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // In dry run mode, validate and return what would happen
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the snapshot.",
                  wouldCreate: {
                    projectId,
                    name,
                    description: description || "(no description)",
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

      // Start the snapshot creation task
      const taskResponse = await client.createSnapshot({
        projectId,
        name,
        description,
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
                  created: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Snapshot creation did not complete within ${timeoutMs}ms. Task may still be running. Use get_task to check status.`,
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
                  created: false,
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
                  created: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Snapshot creation was cancelled.",
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
                created: true,
                status: "done",
                taskId,
                snapshotId,
                projectId,
                name,
                description: description || "(no description)",
                elapsedMs,
                note: snapshotId
                  ? undefined
                  : "Use list_snapshots to find the newly created snapshot.",
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
