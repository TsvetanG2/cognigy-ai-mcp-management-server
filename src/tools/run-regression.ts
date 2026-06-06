/**
 * run_regression tool [composite]
 * Runs all playbooks for a project and returns a pass/fail summary.
 * Turns "is it production-ready?" into a single command.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to run regression tests for"),
  flowId: z
    .string()
    .describe("The flow reference ID to test against"),
  localeId: z
    .string()
    .describe("The locale reference ID"),
  entrypoint: z
    .string()
    .optional()
    .describe("Optional snapshot ID. If not provided, uses the project as entrypoint."),
  timeoutPerPlaybook: z
    .number()
    .int()
    .min(10000)
    .max(300000)
    .default(60000)
    .describe("Timeout per playbook in ms (10-300 seconds, default 60)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), lists playbooks without running. Set to false to actually run."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerRunRegression(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "run_regression",
    "Runs all playbooks in a project as a regression test suite. MUTATING: This executes tests. Use dryRun=true (default) to preview. Returns pass/fail summary with failing playbooks highlighted.",
    inputSchema.shape,
    async (args) => {
      const {
        projectId,
        flowId,
        localeId,
        entrypoint,
        timeoutPerPlaybook,
        dryRun,
      } = inputSchema.parse(args);

      // Get all playbooks in the project
      const playbooksResult = await client.indexPlaybooks({
        projectId,
        limit: 100,
      });

      const playbooks = playbooksResult.items;

      if (playbooks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No playbooks found in project",
                projectId,
              }),
            },
          ],
        };
      }

      // In dry run mode, just show what would be run
      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Set dryRun=false to run the regression suite.",
                  wouldRun: {
                    playbookCount: playbooks.length,
                    playbooks: playbooks.map((p) => ({
                      id: p._id,
                      name: p.name,
                    })),
                    flowId,
                    localeId,
                    entrypoint: entrypoint ?? projectId,
                    timeoutPerPlaybook,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Run each playbook
      const results: Array<{
        playbookId: string;
        name: string;
        status: "passed" | "failed" | "error" | "timeout";
        taskId?: string;
        error?: string;
        elapsedMs?: number;
      }> = [];

      const actualEntrypoint = entrypoint ?? projectId;

      for (const playbook of playbooks) {
        const startTime = Date.now();

        try {
          // Schedule the playbook
          const taskResponse = await client.schedulePlaybook({
            playbookId: playbook._id,
            entrypoint: actualEntrypoint,
            flowId,
            localeId,
          });

          const taskId = taskResponse._id;
          let lastStatus = taskResponse.status;

          // Poll until completion or timeout
          while (Date.now() - startTime < timeoutPerPlaybook) {
            if (TERMINAL_STATES.has(lastStatus)) {
              break;
            }

            await sleep(2000);

            try {
              const task = await client.readTask({ taskId });
              lastStatus = task.status;
            } catch {
              break;
            }
          }

          const elapsedMs = Date.now() - startTime;

          if (lastStatus === "done") {
            // Get the run result to determine pass/fail
            const runs = await client.indexPlaybookRuns({
              playbookId: playbook._id,
              limit: 1,
            });

            const latestRun = runs.items[0];
            results.push({
              playbookId: playbook._id,
              name: playbook.name,
              status: latestRun?.status === "successful" ? "passed" : "failed",
              taskId,
              elapsedMs,
            });
          } else if (lastStatus === "error") {
            results.push({
              playbookId: playbook._id,
              name: playbook.name,
              status: "error",
              taskId,
              error: "Playbook execution failed",
              elapsedMs,
            });
          } else {
            results.push({
              playbookId: playbook._id,
              name: playbook.name,
              status: "timeout",
              taskId,
              elapsedMs,
            });
          }
        } catch (error) {
          results.push({
            playbookId: playbook._id,
            name: playbook.name,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            elapsedMs: Date.now() - startTime,
          });
        }
      }

      // Calculate summary
      const passed = results.filter((r) => r.status === "passed").length;
      const failed = results.filter((r) => r.status === "failed").length;
      const errors = results.filter((r) => r.status === "error").length;
      const timeouts = results.filter((r) => r.status === "timeout").length;

      const allPassed = failed === 0 && errors === 0 && timeouts === 0;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                regressionComplete: true,
                allPassed,
                summary: {
                  total: results.length,
                  passed,
                  failed,
                  errors,
                  timeouts,
                },
                failingPlaybooks: results
                  .filter((r) => r.status !== "passed")
                  .map((r) => ({
                    name: r.name,
                    status: r.status,
                    error: r.error,
                  })),
                results,
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
