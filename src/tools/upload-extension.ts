/**
 * upload_extension tool
 * Uploads a new extension package.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 300000; // 5 minutes

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to upload the extension to"),
  url: z
    .string()
    .describe("URL to the extension package (.tar.gz)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without uploading. Set to false to actually upload."),
});

export function registerUploadExtension(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "upload_extension",
    "Uploads a new Cognigy.AI Extension from a URL. The extension package must be a .tar.gz file. This is an async operation that polls until complete. MUTATING: Set dryRun=false to upload.",
    inputSchema.shape,
    async (args) => {
      const { projectId, url, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to upload the extension.",
                  wouldUpload: {
                    projectId,
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

      // Start the upload
      const uploadResult = await client.uploadExtension({
        projectId,
        url,
      });

      // If it returns a task, poll for completion
      const taskId = (uploadResult as { _id?: string })?._id;
      if (taskId) {
        const startTime = Date.now();

        while (Date.now() - startTime < MAX_POLL_TIME) {
          const task = await client.readTask({ taskId }) as Record<string, unknown>;

          if (task.status === "done") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      uploaded: true,
                      taskId,
                      status: "done",
                      message: "Extension uploaded successfully.",
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
                      uploaded: false,
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
                  uploaded: false,
                  taskId,
                  status: "timeout",
                  message: "Upload started but did not complete within timeout. Use get_task to check status.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // No task ID returned
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                uploaded: true,
                result: uploadResult,
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
