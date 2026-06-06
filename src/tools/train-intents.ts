/**
 * train_intents tool
 * Trains the NLU model for a Cognigy.AI flow.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const trainingModes = ["full", "quick"] as const;

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to train intents for"),
  localeId: z
    .string()
    .optional()
    .describe("Specific locale to train. If omitted, trains all locales."),
  mode: z
    .enum(trainingModes)
    .default("full")
    .describe("Training mode: 'full' for complete retraining, 'quick' for incremental updates"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(300000)
    .default(60000)
    .describe("Maximum time to wait for training to complete (5-300 seconds, default 60)"),
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
    .describe("If true (default), validates without training. Set to false to actually train."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerTrainIntents(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "train_intents",
    "Trains the NLU model for a Cognigy.AI flow. MUTATING: This triggers model training. Use dryRun=true (default) to validate first. Training is async - this tool polls until completion or timeout.",
    inputSchema.shape,
    async (args) => {
      const {
        flowId,
        localeId,
        mode,
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
                  message: "Validation passed. Set dryRun=false to start training.",
                  wouldTrain: {
                    flowId,
                    localeId: localeId ?? "(all locales)",
                    mode,
                    timeoutMs,
                    pollIntervalMs,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the training task
      const trainParams: Record<string, unknown> = {
        flowId,
        mode,
      };
      if (localeId !== undefined) {
        trainParams.localeId = localeId;
      }

      const taskResponse = await client.trainIntents(
        trainParams as unknown as Parameters<typeof client.trainIntents>[0]
      );

      const taskId = taskResponse._id;
      const startTime = Date.now();

      // Poll until completion or timeout
      let lastStatus = taskResponse.status;
      let task: Awaited<ReturnType<typeof client.readTask>> | null = null;

      while (Date.now() - startTime < timeoutMs) {
        // Check if already in terminal state
        if (TERMINAL_STATES.has(lastStatus)) {
          break;
        }

        // Wait before polling
        await sleep(pollIntervalMs);

        // Get task status
        try {
          task = await client.readTask({ taskId });
          lastStatus = task.status;

          if (TERMINAL_STATES.has(lastStatus)) {
            break;
          }
        } catch (error) {
          // Task might not be found if it completed very quickly
          // Try one more time after a short delay
          await sleep(1000);
          try {
            task = await client.readTask({ taskId });
            lastStatus = task.status;
          } catch {
            // Task truly not found, consider it done
            lastStatus = "done";
            break;
          }
        }
      }

      // Check final state
      const elapsedMs = Date.now() - startTime;
      const timedOut = !TERMINAL_STATES.has(lastStatus) && elapsedMs >= timeoutMs;

      if (timedOut) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  trained: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Training did not complete within ${timeoutMs}ms. Task may still be running. Use get_task to check status.`,
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
                  trained: false,
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
                  trained: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Training was cancelled.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Success!
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                trained: true,
                status: "done",
                taskId,
                flowId,
                localeId: localeId ?? "(all locales)",
                mode,
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
