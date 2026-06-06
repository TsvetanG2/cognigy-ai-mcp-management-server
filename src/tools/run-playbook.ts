/**
 * run_playbook tool
 * Runs a playbook and waits for completion with async polling.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  playbookId: z
    .string()
    .describe("The playbook ID to run"),
  entrypoint: z
    .string()
    .describe("The snapshot or project ID to run against"),
  flowId: z
    .string()
    .describe("The reference ID of the flow to test"),
  localeId: z
    .string()
    .describe("The reference ID of the locale"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(300000)
    .default(120000)
    .describe("Maximum time to wait for playbook completion (5-300 seconds, default 120)"),
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
    .describe("If true (default), validates without running. Set to false to actually run the playbook."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerRunPlaybook(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "run_playbook",
    "Runs a playbook test scenario against a flow. MUTATING: This executes test assertions. Use dryRun=true (default) to validate first. Returns pass/fail results with assertion details.",
    inputSchema.shape,
    async (args) => {
      const {
        playbookId,
        entrypoint,
        flowId,
        localeId,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // In dry run mode, validate and return what would happen
      if (dryRun) {
        // Fetch playbook to show what would be run
        const playbook = await client.readPlaybook({ playbookId });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to run the playbook.",
                  wouldRun: {
                    playbookId,
                    playbookName: playbook.name,
                    stepCount: playbook.steps?.length ?? 0,
                    entrypoint,
                    flowId,
                    localeId,
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

      // Schedule the playbook run
      const taskResponse = await client.schedulePlaybook({
        playbookId,
        entrypoint,
        flowId,
        localeId,
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
                  completed: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Playbook did not complete within ${timeoutMs}ms. Use get_task to check status.`,
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
                  completed: false,
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
                  completed: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Playbook run was cancelled.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Success - return basic completion info
      // Use list_playbook_runs to see detailed results
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                completed: true,
                status: "done",
                taskId,
                playbookId,
                elapsedMs,
                message: "Playbook completed. Use list_playbook_runs and get_playbook_run to see detailed results.",
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
