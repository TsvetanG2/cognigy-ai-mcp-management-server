/**
 * merge_package tool
 * Merges a package into a project, importing its resources.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const localeMappingSchema = z.object({
  agentLocaleId: z
    .string()
    .describe("The target locale ID in the project"),
  packageLocaleId: z
    .string()
    .describe("The source locale ID from the package"),
});

const strategySchema = z.object({
  _id: z
    .string()
    .describe("The resource ID from the package to apply this strategy to"),
  rename: z
    .string()
    .optional()
    .describe("Explicitly set a new name for the imported resource"),
  autoRename: z
    .boolean()
    .optional()
    .describe("If true, append a counter suffix if name exists (default true)"),
  identityConflictStrategy: z
    .enum(["replace", "re-identify", "abort"])
    .optional()
    .describe("How to handle identity conflicts: replace, re-identify, or abort"),
});

const inputSchema = z.object({
  packageId: z
    .string()
    .describe("The package ID to merge"),
  resourceIds: z
    .array(z.string())
    .min(1)
    .describe("Array of resource IDs from the package to import"),
  localeMapping: z
    .array(localeMappingSchema)
    .describe("Mapping of package locales to project locales"),
  strategies: z
    .array(strategySchema)
    .optional()
    .describe("Optional conflict resolution strategies per resource type"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(180000)
    .describe("Maximum time to wait for merge (5-600 seconds, default 180)"),
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
    .describe("If true (default), validates without merging. Set to false to actually merge. WARNING: This modifies the target project!"),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerMergePackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "merge_package",
    "Merges a package into a Cognigy.AI project, importing selected resources. Use localeMapping to map package locales to project locales. MUTATING: Set dryRun=false to merge. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        packageId,
        resourceIds,
        localeMapping,
        strategies,
        timeoutMs,
        pollIntervalMs,
        dryRun,
      } = inputSchema.parse(args);

      // Fetch package details for context
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
                  message: "Validation passed. Set dryRun=false to MERGE the package. WARNING: This will modify the target project!",
                  wouldMerge: {
                    packageId,
                    name: packageInfo.name ?? "(unknown)",
                    resourceCount: resourceIds.length,
                    resourceIds,
                    localeMapping,
                    strategies: strategies || "(default strategies)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the merge task
      const mergeParams: Parameters<typeof client.mergePackage>[0] = {
        packageId,
        resourceIds,
        localeMapping,
      };
      if (strategies) {
        mergeParams.strategies = strategies;
      }

      const taskResponse = await client.mergePackage(mergeParams);

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
                  merged: false,
                  status: "timeout",
                  taskId,
                  lastKnownStatus: lastStatus,
                  elapsedMs,
                  message: `Merge did not complete within ${timeoutMs}ms. Task may still be running.`,
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
                  merged: false,
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
                  merged: false,
                  status: "cancelled",
                  taskId,
                  elapsedMs,
                  message: "Package merge was cancelled.",
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
                merged: true,
                status: "done",
                taskId,
                packageId,
                name: packageInfo.name ?? "(unknown)",
                resourcesMerged: resourceIds.length,
                elapsedMs,
                message: "Package resources have been merged into the project.",
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
