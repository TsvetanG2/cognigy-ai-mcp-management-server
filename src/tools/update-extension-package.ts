/**
 * update_extension_package tool
 * Updates an extension with a new package version.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 300000; // 5 minutes

const inputSchema = z.object({
  extensionId: z
    .string()
    .describe("The extension ID to update"),
  url: z
    .string()
    .describe("URL to the new extension package (.tar.gz)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateExtensionPackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_extension_package",
    "Updates a Cognigy.AI Extension with a new package version from a URL. Use this to upgrade an extension to a new version. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { extensionId, url, dryRun } = inputSchema.parse(args);

      // Verify the extension exists
      const existing = await client.readExtension({ extensionId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the extension package.",
                  existingExtension: {
                    _id: existing._id,
                    name: existing.name,
                    version: existing.version,
                  },
                  wouldUpdate: {
                    url,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Start the update
      const updateResult = await client.updateExtensionPackage({
        extension: extensionId,
        url,
      } as any);

      // If it returns a task, poll for completion
      const taskId = (updateResult as { _id?: string })?._id;
      if (taskId) {
        const startTime = Date.now();

        while (Date.now() - startTime < MAX_POLL_TIME) {
          const task = await client.readTask({ taskId }) as unknown as Record<string, unknown>;

          if (task.status === "done") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      updated: true,
                      extensionId,
                      taskId,
                      status: "done",
                      message: "Extension package updated successfully.",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          if (task.status === "error") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      updated: false,
                      extensionId,
                      taskId,
                      status: "error",
                      error: task.failReason || "Unknown error",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  updated: false,
                  extensionId,
                  taskId,
                  status: "timeout",
                  message: "Update started but did not complete within timeout. Use get_task to check status.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                extensionId,
                result: updateResult,
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
