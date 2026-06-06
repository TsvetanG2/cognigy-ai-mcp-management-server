/**
 * create_package tool
 * Creates a new package from selected resources.
 * This is an async operation that polls the task until completion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the package in"),
  name: z
    .string()
    .describe("Name for the package"),
  resourceIds: z
    .array(z.string())
    .min(1)
    .describe("Array of resource IDs to include in the package (flows, endpoints, etc.)"),
  description: z
    .string()
    .optional()
    .describe("Optional description of the package"),
  timeoutMs: z
    .number()
    .int()
    .min(5000)
    .max(600000)
    .default(120000)
    .describe("Maximum time to wait for package creation (5-600 seconds, default 120)"),
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
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

// Terminal task states
const TERMINAL_STATES = new Set(["done", "cancelled", "error"]);

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerCreatePackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_package",
    "Creates a package from selected resources in a Cognigy.AI project. Packages bundle flows, endpoints, and other resources for transfer between projects. MUTATING: Set dryRun=false to create. Async operation.",
    inputSchema.shape,
    async (args) => {
      const {
        projectId,
        name,
        resourceIds,
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
                  message: "Validation passed. Set dryRun=false to create the package.",
                  wouldCreate: {
                    projectId,
                    name,
                    description: description || "(no description)",
                    resourceCount: resourceIds.length,
                    resourceIds,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the package creation task
      const createParams: Parameters<typeof client.createPackage>[0] = {
        projectId,
        name,
        resourceIds,
      };
      if (description) {
        createParams.description = description;
      }

      const taskResponse = await client.createPackage(createParams);

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
                  message: `Package creation did not complete within ${timeoutMs}ms. Task may still be running.`,
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
                  message: "Package creation was cancelled.",
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
                created: true,
                status: "done",
                taskId,
                packageId,
                projectId,
                name,
                resourceCount: resourceIds.length,
                elapsedMs,
                note: packageId
                  ? undefined
                  : "Use list_packages to find the newly created package.",
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
